from datetime import date
from database import supabase


def read_today_log(user_id: str) -> dict:
    """Read today's daily_features row for user. Returns {} if none."""
    res = (
        supabase.table("daily_features")
        .select("features")
        .eq("user_id", user_id)
        .eq("date", str(date.today()))
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return {}
    return res.data[0].get("features") or {}


def upsert_daily_log(user_id: str, updates: dict) -> None:
    """Merge `updates` into today's daily_features row (upsert on user_id+date)."""
    existing = read_today_log(user_id)
    merged = {**existing, **updates}
    supabase.table("daily_features").upsert(
        {
            "user_id": user_id,
            "date": str(date.today()),
            "features": merged,
        },
        on_conflict="user_id,date",
    ).execute()
