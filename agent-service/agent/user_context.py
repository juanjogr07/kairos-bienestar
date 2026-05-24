from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class UserContext:
    user_id: str
    # Survey scores
    phq9_baseline: Optional[float] = None
    gad7_baseline: Optional[float] = None
    phq9_current: Optional[float] = None
    gad7_current: Optional[float] = None
    # Today's check-in (from daily_features)
    morning_mood: Optional[int] = None      # 1-5
    sleep_quality: Optional[int] = None    # 1-5
    wake_time: Optional[str] = None
    has_event_today: bool = False
    sleep_hours: Optional[float] = None
    screen_hours: Optional[float] = None
    physical_energy: Optional[int] = None  # 1-5
    hours_since_meal: Optional[float] = None
    checkin_done: bool = False
    nocturnal_ratio: float = 0.0
    # Phase / streak
    days_active: int = 0
    days_since_active: int = 0
    current_streak: int = 0
    # True if current local hour >= 21
    is_evening: bool = False

    @property
    def user_phase(self) -> int:
        if self.days_active >= 60:
            return 3
        if self.days_active >= 15:
            return 2
        return 1

    @property
    def crisis_flag(self) -> bool:
        return (
            (self.phq9_current is not None and self.phq9_current >= 15)
            or (self.gad7_current is not None and self.gad7_current >= 15)
        )

    @property
    def fuel_block_flag(self) -> bool:
        return self.hours_since_meal is not None and self.hours_since_meal > 8

    @property
    def sleep_block_flag(self) -> bool:
        return (
            self.sleep_hours is not None
            and self.sleep_hours < 5
            and self.is_evening
        )

    @property
    def streak_paused(self) -> bool:
        return self.days_since_active >= 3
