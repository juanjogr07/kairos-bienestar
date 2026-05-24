from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal
from datetime import datetime


class UsageEvent(BaseModel):
    domain: str
    duration_seconds: int
    event_type: Literal["tab_active", "tab_idle", "scroll", "notification"]
    scroll_speed: Optional[float] = None
    timestamp: datetime

    @field_validator("domain")
    @classmethod
    def sanitize_domain(cls, v: str) -> str:
        v = v.lower().strip()
        # Strip protocol
        for prefix in ("https://", "http://"):
            if v.startswith(prefix):
                v = v[len(prefix):]
                break
        # Strip www.
        if v.startswith("www."):
            v = v[4:]
        # Strip path, query string, port
        v = v.split("/")[0].split("?")[0].split("#")[0].split(":")[0]
        return v


class EventBatch(BaseModel):
    events: List[UsageEvent]


class EventBatchResponse(BaseModel):
    received: int
