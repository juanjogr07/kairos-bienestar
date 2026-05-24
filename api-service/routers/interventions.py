from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/v1", tags=["interventions"])


class InterventionLog(BaseModel):
    trigger_type: str
    playbook_slug: Optional[str] = None


class InterventionOut(BaseModel):
    id: str
    trigger_type: str
    playbook_slug: Optional[str]
    shown_at: str
    acted_upon: bool


@router.get("/interventions", response_model=List[InterventionOut])
async def list_interventions(user_id: str = Depends(get_current_user)):
    res = (
        supabase.table("intervention_log")
        .select("id, trigger_type, playbook_slug, shown_at, acted_upon")
        .eq("user_id", user_id)
        .order("shown_at", desc=True)
        .limit(20)
        .execute()
    )
    return [InterventionOut(**row) for row in (res.data or [])]


@router.post("/interventions", response_model=InterventionOut)
async def log_intervention(
    body: InterventionLog,
    user_id: str = Depends(get_current_user),
):
    res = (
        supabase.table("intervention_log")
        .insert(
            {
                "user_id": user_id,
                "trigger_type": body.trigger_type,
                "playbook_slug": body.playbook_slug,
            }
        )
        .execute()
    )
    row = res.data[0]
    return InterventionOut(**row)


@router.post("/interventions/{intervention_id}/act")
async def mark_acted(
    intervention_id: str,
    user_id: str = Depends(get_current_user),
):
    supabase.table("intervention_log").update({"acted_upon": True}).eq(
        "id", intervention_id
    ).eq("user_id", user_id).execute()
    return {"status": "ok"}
