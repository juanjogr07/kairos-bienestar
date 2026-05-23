from fastapi import APIRouter, Depends
from auth import get_current_user
from database import supabase
from datetime import date, timedelta
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1", tags=["dashboard"])


class DomainUsage(BaseModel):
    domain: str
    minutes: int


class DashboardResponse(BaseModel):
    today_usage_min: int
    top_domains: List[DomainUsage]
    active_habits: int
    total_habit_completions_today: int
    last_phq9_score: Optional[float]
    last_gad7_score: Optional[float]
    last_survey_date: Optional[str]
    onboarding_completed: bool


class WeeklyUsageDay(BaseModel):
    day: str
    label: str
    minutes: int


@router.get("/dashboard/weekly-usage", response_model=List[WeeklyUsageDay])
async def weekly_usage(user_id: str = Depends(get_current_user)):
    """Retorna el uso digital del usuario agrupado por día de los últimos 7 días.

    Siempre devuelve exactamente 7 items (del más antiguo al más reciente),
    rellenando con 0 los días sin datos.
    """
    today = date.today()
    days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]

    labels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

    res = (
        supabase.table("usage_events")
        .select("timestamp, duration_seconds")
        .eq("user_id", user_id)
        .gte("timestamp", days[0].isoformat())
        .execute()
    )

    # Agrupar segundos por día
    day_totals: dict[str, int] = {d.isoformat(): 0 for d in days}
    for ev in res.data:
        day_key = ev["timestamp"][:10]
        if day_key in day_totals:
            day_totals[day_key] += ev["duration_seconds"]

    return [
        WeeklyUsageDay(
            day=d.isoformat(),
            label=labels[d.weekday()],
            minutes=day_totals[d.isoformat()] // 60,
        )
        for d in days
    ]


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(user_id: str = Depends(get_current_user)):
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    events_res = (
        supabase.table("usage_events")
        .select("domain, duration_seconds")
        .eq("user_id", user_id)
        .gte("timestamp", today)
        .lt("timestamp", tomorrow)
        .execute()
    )

    domain_map: dict[str, int] = {}
    for ev in events_res.data:
        d = ev["domain"]
        domain_map[d] = domain_map.get(d, 0) + ev["duration_seconds"]

    today_usage_min = sum(domain_map.values()) // 60
    top_domains = sorted(
        [DomainUsage(domain=k, minutes=v // 60) for k, v in domain_map.items()],
        key=lambda x: x.minutes,
        reverse=True,
    )[:5]

    habits_res = (
        supabase.table("habits")
        .select("id")
        .eq("user_id", user_id)
        .eq("active", True)
        .execute()
    )
    active_habits = len(habits_res.data)

    completions_res = (
        supabase.table("habit_completions")
        .select("id")
        .eq("user_id", user_id)
        .gte("completed_at", today)
        .execute()
    )
    total_habit_completions_today = len(completions_res.data)

    phq9_res = (
        supabase.table("survey_responses")
        .select("total_score, created_at")
        .eq("user_id", user_id)
        .eq("survey_type", "phq9")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )

    last_phq9_score = phq9_res.data[0]["total_score"] if phq9_res.data else None
    last_survey_date = phq9_res.data[0]["created_at"][:10] if phq9_res.data else None

    gad7_res = (
        supabase.table("survey_responses")
        .select("total_score")
        .eq("user_id", user_id)
        .eq("survey_type", "gad7")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    last_gad7_score = gad7_res.data[0]["total_score"] if gad7_res.data else None

    onboarding_completed = last_phq9_score is not None and last_gad7_score is not None

    return DashboardResponse(
        today_usage_min=today_usage_min,
        top_domains=top_domains,
        active_habits=active_habits,
        total_habit_completions_today=total_habit_completions_today,
        last_phq9_score=last_phq9_score,
        last_gad7_score=last_gad7_score,
        last_survey_date=last_survey_date,
        onboarding_completed=onboarding_completed,
    )
