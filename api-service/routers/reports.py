from fastapi import APIRouter, Depends
from auth import get_current_user
from database import supabase
from services.habits.recommender import get_habit_recommendations, PLAYBOOK_HABIT_MAP
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta

router = APIRouter(prefix="/api/v1", tags=["reports"])


class DomainMetric(BaseModel):
    domain: str
    minutes: int


class WeeklyMetrics(BaseModel):
    total_minutes: int
    daily_average_minutes: int
    top_domains: List[DomainMetric]
    days_with_data: int
    nocturnal_minutes: int


class WeeklyReportResponse(BaseModel):
    id: str
    week_start: str
    metrics: WeeklyMetrics
    narrative: Optional[str]
    created_at: str


class HabitRecommendation(BaseModel):
    name: str
    playbook_slug: str


class RecommendationsResponse(BaseModel):
    playbook_slug: Optional[str]
    recommendations: List[HabitRecommendation]


@router.get("/reports/weekly", response_model=WeeklyReportResponse)
async def get_weekly_report(user_id: str = Depends(get_current_user)):
    """Return the most recent weekly report, computing one if none exists this week."""
    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()

    existing = (
        supabase.table("weekly_reports")
        .select("*")
        .eq("user_id", user_id)
        .eq("week_start", week_start)
        .limit(1)
        .execute()
    )

    if existing.data:
        row = existing.data[0]
        return WeeklyReportResponse(
            id=row["id"],
            week_start=row["week_start"],
            metrics=WeeklyMetrics(**row["metrics"]),
            narrative=row.get("narrative"),
            created_at=row["created_at"],
        )

    metrics = _compute_weekly_metrics(user_id, week_start)
    narrative = _build_narrative(metrics)

    result = (
        supabase.table("weekly_reports")
        .insert({
            "user_id": user_id,
            "week_start": week_start,
            "metrics": metrics.model_dump(),
            "narrative": narrative,
        })
        .execute()
    )

    row = result.data[0]
    return WeeklyReportResponse(
        id=row["id"],
        week_start=row["week_start"],
        metrics=metrics,
        narrative=narrative,
        created_at=row["created_at"],
    )


@router.get("/reports/weekly/history", response_model=List[WeeklyReportResponse])
async def get_weekly_history(user_id: str = Depends(get_current_user)):
    """Return up to 8 weeks of past reports."""
    res = (
        supabase.table("weekly_reports")
        .select("*")
        .eq("user_id", user_id)
        .order("week_start", desc=True)
        .limit(8)
        .execute()
    )

    return [
        WeeklyReportResponse(
            id=r["id"],
            week_start=r["week_start"],
            metrics=WeeklyMetrics(**r["metrics"]),
            narrative=r.get("narrative"),
            created_at=r["created_at"],
        )
        for r in (res.data or [])
    ]


@router.get("/habits/recommendations", response_model=RecommendationsResponse)
async def habit_recommendations(
    user_id: str = Depends(get_current_user),
    limit: int = 3,
):
    """Return habit recommendations based on the user's active playbook from ML results."""
    ml_res = (
        supabase.table("ml_results")
        .select("result, model_type")
        .eq("user_id", user_id)
        .eq("model_type", "xgboost_mood")
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )

    playbook_slug = _detect_playbook_from_ml(ml_res.data[0]["result"] if ml_res.data else {})

    habits_res = (
        supabase.table("habits")
        .select("playbook_slug")
        .eq("user_id", user_id)
        .eq("active", True)
        .execute()
    )
    active_slugs = [h.get("playbook_slug", "") for h in (habits_res.data or []) if h.get("playbook_slug")]

    recs = get_habit_recommendations(user_id, active_slugs, playbook_slug, limit)

    return RecommendationsResponse(
        playbook_slug=playbook_slug,
        recommendations=[HabitRecommendation(**r) for r in recs],
    )


def _compute_weekly_metrics(user_id: str, week_start: str) -> WeeklyMetrics:
    week_end = (date.fromisoformat(week_start) + timedelta(days=7)).isoformat()

    events_res = (
        supabase.table("usage_events")
        .select("domain, duration_seconds, timestamp")
        .eq("user_id", user_id)
        .gte("timestamp", week_start)
        .lt("timestamp", week_end)
        .execute()
    )

    events = events_res.data or []
    domain_map: dict[str, int] = {}
    nocturnal_seconds = 0
    days_with_data: set = set()

    for ev in events:
        domain_map[ev["domain"]] = domain_map.get(ev["domain"], 0) + ev["duration_seconds"]
        day_key = ev["timestamp"][:10]
        days_with_data.add(day_key)
        hour = int(ev["timestamp"][11:13]) if len(ev["timestamp"]) >= 13 else 0
        if hour >= 22 or hour < 7:
            nocturnal_seconds += ev["duration_seconds"]

    total_seconds = sum(domain_map.values())
    days_count = len(days_with_data) or 1
    top_domains = sorted(
        [DomainMetric(domain=k, minutes=v // 60) for k, v in domain_map.items()],
        key=lambda x: x.minutes,
        reverse=True,
    )[:5]

    return WeeklyMetrics(
        total_minutes=total_seconds // 60,
        daily_average_minutes=(total_seconds // 60) // days_count,
        top_domains=top_domains,
        days_with_data=len(days_with_data),
        nocturnal_minutes=nocturnal_seconds // 60,
    )


def _build_narrative(metrics: WeeklyMetrics) -> str:
    top = metrics.top_domains[0].domain if metrics.top_domains else "ningún sitio"
    nocturnal_pct = (
        round(metrics.nocturnal_minutes * 100 / metrics.total_minutes)
        if metrics.total_minutes > 0
        else 0
    )
    lines = [
        f"Esta semana usaste tu dispositivo un promedio de {metrics.daily_average_minutes} minutos por día.",
        f"Tu sitio más visitado fue {top}.",
    ]
    if nocturnal_pct > 20:
        lines.append(
            f"El {nocturnal_pct}% de tu tiempo digital fue en horario nocturno (22h–7h), "
            "lo que puede afectar la calidad del sueño."
        )
    if metrics.total_minutes == 0:
        return "No hay suficientes datos de uso esta semana para generar un resumen."
    return " ".join(lines)


def _detect_playbook_from_ml(result: dict) -> str | None:
    scores = {
        "attention-fragmentation": result.get("attention_fragmentation_score", 0.0),
        "nocturnal-use-pattern": result.get("nocturnal_pattern_score", 0.0),
        "doomscrolling": result.get("doomscrolling_score", 0.0),
    }
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0.5 else None
