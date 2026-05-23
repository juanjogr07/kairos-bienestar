from database import supabase
from datetime import date, timedelta


def get_usage_summary(user_id: str, days: int = 7) -> dict:
    since = (date.today() - timedelta(days=days)).isoformat()

    result = (
        supabase.table("usage_events")
        .select("domain, duration_seconds, timestamp")
        .eq("user_id", user_id)
        .gte("timestamp", since)
        .execute()
    )

    domain_totals: dict[str, int] = {}
    daily_totals: dict[str, int] = {}

    for ev in result.data:
        domain = ev["domain"]
        seconds = ev["duration_seconds"]
        day = ev["timestamp"][:10]
        domain_totals[domain] = domain_totals.get(domain, 0) + seconds
        daily_totals[day] = daily_totals.get(day, 0) + seconds

    top_domains = sorted(
        [{"domain": d, "minutes": s // 60} for d, s in domain_totals.items()],
        key=lambda x: x["minutes"],
        reverse=True,
    )[:5]

    today_seconds = daily_totals.get(date.today().isoformat(), 0)
    avg_daily = sum(daily_totals.values()) // max(len(daily_totals), 1)

    return {
        "top_domains": top_domains,
        "today_minutes": today_seconds // 60,
        "avg_daily_minutes": avg_daily // 60,
        "days_with_data": len(daily_totals),
    }
