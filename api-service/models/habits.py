from pydantic import BaseModel
from typing import Optional


class HabitCreate(BaseModel):
    name: str
    playbook_slug: Optional[str] = None
    frequency: str = "daily"


class HabitOut(BaseModel):
    id: str
    name: str
    playbook_slug: Optional[str]
    frequency: str
    active: bool
    current_streak: int
    completed_today: bool
