from fastapi import APIRouter, Depends
from models.events import EventBatch, EventBatchResponse
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/v1", tags=["events"])


@router.post("/events/batch", response_model=EventBatchResponse)
async def ingest_events(
    batch: EventBatch,
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
    return EventBatchResponse(received=len(rows))
