from typing import List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from auth import get_current_user
from database import supabase
from services.notification_service import check_habit_reminders

router = APIRouter(prefix="/api/v1", tags=["notifications"])


class NotificationOut(BaseModel):
    id: str
    type: str
    title: str
    body: str
    created_at: str


class MarkReadResponse(BaseModel):
    success: bool


@router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    background_tasks.add_task(check_habit_reminders, user_id)

    res = (
        supabase.table("notifications")
        .select("id, type, title, body, created_at")
        .eq("user_id", user_id)
        .eq("read", False)
        .order("created_at", desc=True)
        .execute()
    )

    return res.data


@router.post("/notifications/{notification_id}/read", response_model=MarkReadResponse)
async def mark_notification_read(
    notification_id: UUID,
    user_id: str = Depends(get_current_user),
):
    res = (
        supabase.table("notifications")
        .update({"read": True})
        .eq("id", str(notification_id))
        .eq("user_id", user_id)
        .execute()
    )

    if not res.data:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    return {"success": True}
