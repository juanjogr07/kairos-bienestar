from datetime import date

from fastapi import APIRouter, BackgroundTasks, Depends
from models.events import EventBatch, EventBatchResponse
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/v1", tags=["events"])


def _trigger_inference_bg(user_id: str) -> None:
    """Background task: run ML inference after events are ingested."""
    try:
        from services.ml.feature_extraction import compute_daily_features
        from services.ml.inference import run_full_inference, models_available

        if not models_available():
            return

        features = compute_daily_features(user_id, date.today())
        if features.get("days_with_data", 0) == 0:
            return

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

        result = run_full_inference(features, phq9_score=phq9, gad7_score=gad7)
        supabase.table("ml_results").upsert(
            {
                "user_id": user_id,
                "model_type": "full_pipeline",
                "result": result["result"],
                "computed_at": date.today().isoformat(),
            },
            on_conflict="user_id,model_type",
        ).execute()
    except Exception:
        pass  # inference failures must never break event ingestion


@router.post("/events/batch", response_model=EventBatchResponse)
async def ingest_events(
    batch: EventBatch,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    if not batch.events:
        return EventBatchResponse(received=0)

    rows = [
        {
            "user_id": user_id,
            "domain": event.domain,
            "duration_seconds": event.duration_seconds,
            "event_type": event.event_type,
            "scroll_speed": event.scroll_speed,
            "source": "extension",
            "timestamp": event.timestamp.isoformat(),
        }
        for event in batch.events
    ]

    supabase.table("usage_events").insert(rows).execute()
    background_tasks.add_task(_trigger_inference_bg, user_id)
    return EventBatchResponse(received=len(rows))
