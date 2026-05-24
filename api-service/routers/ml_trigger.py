from fastapi import APIRouter, Depends, BackgroundTasks
from auth import get_current_user
from database import supabase
from services.ml.runner import run_all_models_for_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1", tags=["ml"])


class MLRunResponse(BaseModel):
    status: str
    user_id: str
    models_run: list[str]


@router.post("/ml/run", response_model=MLRunResponse)
async def trigger_ml_pipeline(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """Trigger ML pipeline for the authenticated user (async in background)."""
    background_tasks.add_task(_run_ml, user_id)
    return MLRunResponse(
        status="queued",
        user_id=user_id,
        models_run=["isolation_forest", "xgboost_mood"],
    )


def _run_ml(user_id: str) -> None:
    run_all_models_for_user(user_id, supabase)
