from datetime import date
from fastapi import APIRouter, Depends
from auth import get_current_user
from agent.daily_log import read_today_log
from agent.tools.get_usage_summary import get_usage_summary
from database import supabase

router = APIRouter(prefix="/api/v1/progress", tags=["progress"])


@router.get("/summary")
async def progress_summary(user_id: str = Depends(get_current_user)):
    """Returns phase, streak, and 14-day trend for the dashboard."""
    log = read_today_log(user_id)

    streak_data = {"current_streak": 0, "longest_streak": 0, "streak_paused": False}
    try:
        res = (supabase.table("streaks")
               .select("current_streak,longest_streak,last_completion")
               .eq("user_id", user_id).limit(1).execute())
        if res.data:
            row = res.data[0]
            current = row.get("current_streak", 0)
            last = row.get("last_completion")
            days_since = 0
            if last:
                days_since = (date.today() - date.fromisoformat(str(last))).days
            streak_data = {
                "current_streak": current,
                "longest_streak": row.get("longest_streak", 0),
                "streak_paused": days_since >= 3,
                "days_since_active": days_since,
            }
    except Exception:
        pass

    days_active = streak_data["current_streak"]
    user_phase = 3 if days_active >= 60 else (2 if days_active >= 15 else 1)

    usage = get_usage_summary(user_id, days=14)

    return {
        "user_phase": user_phase,
        "phase_label": {1: "Observación", 2: "Correlaciones", 3: "Retos"}[user_phase],
        "days_active": days_active,
        **streak_data,
        "today_log": log,
        "usage_14d": usage,
    }
