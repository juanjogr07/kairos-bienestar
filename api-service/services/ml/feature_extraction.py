"""
Daily behavioral feature extraction from raw usage_events.
Produces the feature vector used by all 3 ML models.
"""
from datetime import date, timedelta, datetime, timezone

from database import supabase

SOCIAL_DOMAINS = {
    "youtube.com", "instagram.com", "twitter.com", "x.com",
    "tiktok.com", "facebook.com", "reddit.com", "twitch.tv",
}
PRODUCTIVE_DOMAINS = {
    "github.com", "stackoverflow.com", "docs.google.com", "notion.so",
    "linear.app", "figma.com", "jira.atlassian.com", "confluence.atlassian.com",
    "coursera.org", "khanacademy.org",
}
NOCTURNAL_HOURS = set(range(22, 24)) | set(range(0, 6))


def compute_daily_features(user_id: str, target_date: date) -> dict:
    start = target_date.isoformat() + "T00:00:00"
    end = (target_date + timedelta(days=1)).isoformat() + "T00:00:00"

    rows = (
        supabase.table("usage_events")
        .select("domain, duration_seconds, scroll_speed, timestamp, event_type")
        .eq("user_id", user_id)
        .gte("timestamp", start)
        .lt("timestamp", end)
        .execute()
        .data
    )

    if not rows:
        return _empty_features()

    total_sec = sum(r.get("duration_seconds") or 0 for r in rows)
    total_min = total_sec / 60.0

    nocturnal_sec = 0
    for r in rows:
        try:
            ts_str = r.get("timestamp", "")
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if ts.hour in NOCTURNAL_HOURS:
                nocturnal_sec += r.get("duration_seconds") or 0
        except Exception:
            pass
    nocturnal_min = nocturnal_sec / 60.0

    # Session count: unique domain visits (rough: each row is ~1 session segment)
    session_count = max(1, len(rows) // 3)

    # App switches: domain changes in chronological order
    sorted_rows = sorted(rows, key=lambda x: x.get("timestamp", ""))
    app_switches = 0
    prev_domain = None
    for r in sorted_rows:
        d = r.get("domain")
        if prev_domain and d != prev_domain:
            app_switches += 1
        prev_domain = d

    # Ratios
    social_sec = sum(r.get("duration_seconds") or 0 for r in rows if r.get("domain") in SOCIAL_DOMAINS)
    productive_sec = sum(r.get("duration_seconds") or 0 for r in rows if r.get("domain") in PRODUCTIVE_DOMAINS)
    social_ratio = social_sec / total_sec if total_sec > 0 else 0.0
    productive_ratio = productive_sec / total_sec if total_sec > 0 else 0.0
    nocturnal_ratio = nocturnal_min / total_min if total_min > 0 else 0.0

    # Scroll speed (px/s from extension)
    speeds = [r["scroll_speed"] for r in rows if r.get("scroll_speed") and r["scroll_speed"] > 0]
    avg_scroll_speed = sum(speeds) / len(speeds) if speeds else 0.0

    max_event_min = max((r.get("duration_seconds") or 0) / 60.0 for r in rows)

    # Scroll distance (km) — scaled to training range [0–2km] (training mean≈0.5)
    scroll_distance_km = round(min(total_min / 500.0 * (1.0 + avg_scroll_speed / 1000.0), 2.0), 3)

    notification_count = sum(1 for r in rows if r.get("event_type") == "notification")

    # app_switches_per_hour (IF feature 3; training mean≈15 switches/hour)
    usage_hours = max(total_min / 60.0, 0.1)
    app_switches_per_hour = round(app_switches / usage_hours, 2)

    return {
        "total_usage_min": round(total_min, 2),
        "nocturnal_min": round(nocturnal_min, 2),
        "nocturnal_ratio": round(nocturnal_ratio, 3),
        "social_ratio": round(social_ratio, 3),
        "productive_ratio": round(productive_ratio, 3),
        "avg_scroll_speed": round(avg_scroll_speed, 2),
        "session_count": session_count,
        "max_session_min": round(max_event_min, 2),
        "scroll_distance_km": scroll_distance_km,
        "notification_count": notification_count,
        "app_switches": app_switches,
        "app_switches_per_hour": app_switches_per_hour,
        "days_with_data": 1,
    }


def _empty_features() -> dict:
    return {
        "total_usage_min": 0.0, "nocturnal_min": 0.0, "nocturnal_ratio": 0.0,
        "social_ratio": 0.0, "productive_ratio": 0.0, "avg_scroll_speed": 0.0,
        "session_count": 0, "max_session_min": 0.0, "scroll_distance_km": 0.0,
        "notification_count": 0, "app_switches": 0, "app_switches_per_hour": 0.0,
        "days_with_data": 0,
    }
