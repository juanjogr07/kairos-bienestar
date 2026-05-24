"""
CV Router — POST /api/v1/cv/analyze

Accepts base64-encoded webcam/environment frames,
runs the CVPipeline, persists scores to Supabase,
and returns structured posture + environment data.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth import get_current_user
from database import supabase
from services.cv_service import analyze_frame, CV_AVAILABLE

router = APIRouter(prefix="/api/v1/cv", tags=["computer-vision"])


class CVAnalyzeRequest(BaseModel):
    webcam_frame_b64: str | None = Field(None, description="Base64-encoded JPEG/PNG from webcam")
    env_frame_b64: str | None = Field(None, description="Base64-encoded JPEG/PNG of environment")


class PostureOut(BaseModel):
    posture_score: float
    eye_strain_score: float
    blink_rate_rpm: float
    head_tilt_deg: float
    landmarks_detected: bool


class EnvironmentOut(BaseModel):
    context: str
    confidence: float
    detected_objects: list[str]


class CVAnalyzeResponse(BaseModel):
    cv_available: bool
    physical_wellness_score: float
    digital_context_score: float
    distraction_risk_score: float
    posture: PostureOut
    environment: EnvironmentOut
    persisted: bool = False


@router.get("/status")
async def cv_status():
    """Health check — reports whether CV models are loaded."""
    return {"cv_available": CV_AVAILABLE}


@router.post("/analyze", response_model=CVAnalyzeResponse)
async def analyze(
    body: CVAnalyzeRequest,
    user_id: str = Depends(get_current_user),
):
    result = analyze_frame(
        webcam_b64=body.webcam_frame_b64,
        env_b64=body.env_frame_b64,
    )

    persisted = False
    if result["cv_available"]:
        try:
            supabase.table("cv_scores").upsert({
                "user_id": user_id,
                "physical_wellness_score": result["physical_wellness_score"],
                "digital_context_score": result["digital_context_score"],
                "distraction_risk_score": result["distraction_risk_score"],
                "posture_score": result["posture"]["posture_score"],
                "eye_strain_score": result["posture"]["eye_strain_score"],
                "blink_rate_rpm": result["posture"]["blink_rate_rpm"],
                "environment_context": result["environment"]["context"],
            }).execute()
            persisted = True
        except Exception:
            pass  # DB write failure is non-fatal

    return CVAnalyzeResponse(
        cv_available=result["cv_available"],
        physical_wellness_score=result["physical_wellness_score"],
        digital_context_score=result["digital_context_score"],
        distraction_risk_score=result["distraction_risk_score"],
        posture=PostureOut(**result["posture"]),
        environment=EnvironmentOut(**result["environment"]),
        persisted=persisted,
    )
