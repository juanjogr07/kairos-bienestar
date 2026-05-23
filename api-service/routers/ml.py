"""
ML inference endpoint — triggers daily feature extraction and model scoring.
Called manually (demo/test) or post-event-batch in a real deployment.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import supabase
from services.ml.feature_extraction import compute_daily_features
from services.ml.inference import run_full_inference, models_available

router = APIRouter(prefix="/api/v1/ml", tags=["ml"])


class InferenceRequest(BaseModel):
    target_date: date | None = None   # defaults to today


class InferenceResponse(BaseModel):
    user_id: str
    date: str
    features: dict
    result: dict
    saved: bool


@router.post("/run_inference", response_model=InferenceResponse)
async def run_inference(
    req: InferenceRequest,
    user_id: str = Depends(get_current_user),
):
    if not models_available():
        raise HTTPException(
            status_code=503,
            detail="ML models not found. Run ml-worker/run_bootstrap.py first.",
        )

    target = req.target_date or date.today()

    # Get latest PHQ-9 / GAD-7 for this user
    phq9, gad7 = 0.0, 0.0
    survey_row = (
        supabase.table("surveys")
        .select("phq9_score, gad7_score")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
        .data
    )
    if survey_row:
        phq9 = float(survey_row[0].get("phq9_score") or 0)
        gad7 = float(survey_row[0].get("gad7_score") or 0)

    features = compute_daily_features(user_id, target)
    inference_result = run_full_inference(features, phq9_score=phq9, gad7_score=gad7)

    # Persist to ml_results
    saved = False
    try:
        supabase.table("ml_results").upsert({
            "user_id": user_id,
            "model_type": "full_pipeline",
            "result": inference_result["result"],
            "computed_at": target.isoformat(),
        }, on_conflict="user_id,model_type").execute()
        saved = True
    except Exception:
        pass

    return InferenceResponse(
        user_id=user_id,
        date=target.isoformat(),
        features=features,
        result=inference_result["result"],
        saved=saved,
    )


@router.get("/status")
async def ml_status():
    return {"models_available": models_available()}
