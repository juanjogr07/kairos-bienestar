"""
Fake seed data aligned with infra/supabase/seeds/ and migration schemas.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

DEMO_USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
HABIT_ID = "11111111-2222-3333-4444-555555555555"
NOTIFICATION_ID = "22222222-3333-4444-5555-666666666666"
INTERVENTION_ID = "33333333-4444-5555-6666-777777777777"
PLAYBOOK_ID = "44444444-5555-6666-7777-888888888888"
WEEKLY_REPORT_ID = "55555555-6666-7777-8888-999999999999"


def _ts(days_ago: int = 0, hour: int = 12) -> str:
    base = datetime.now(timezone.utc).replace(
        hour=hour, minute=0, second=0, microsecond=0
    ) - timedelta(days=days_ago)
    return base.isoformat()


def _week_start() -> str:
    today = date.today()
    return (today - timedelta(days=today.weekday())).isoformat()


def build_demo_tables() -> dict[str, list[dict[str, Any]]]:
    """Return in-memory tables mirroring the demo SQL seeds."""
    week_start = _week_start()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    three_days_ago = (date.today() - timedelta(days=3)).isoformat()
    seven_days_ago = (date.today() - timedelta(days=7)).isoformat()

    usage_events = [
        {"id": 1, "user_id": DEMO_USER_ID, "domain": "youtube.com", "duration_seconds": 2700, "event_type": "tab_active", "scroll_speed": 320.0, "source": "extension", "timestamp": _ts(6, 14), "created_at": _ts(6, 14)},
        {"id": 2, "user_id": DEMO_USER_ID, "domain": "instagram.com", "duration_seconds": 1800, "event_type": "tab_active", "scroll_speed": 920.3, "source": "extension", "timestamp": _ts(6, 21), "created_at": _ts(6, 21)},
        {"id": 3, "user_id": DEMO_USER_ID, "domain": "twitter.com", "duration_seconds": 900, "event_type": "tab_active", "scroll_speed": 755.1, "source": "extension", "timestamp": _ts(6, 23), "created_at": _ts(6, 23)},
        {"id": 4, "user_id": DEMO_USER_ID, "domain": "youtube.com", "duration_seconds": 3600, "event_type": "tab_active", "scroll_speed": 280.0, "source": "extension", "timestamp": _ts(5, 20), "created_at": _ts(5, 20)},
        {"id": 5, "user_id": DEMO_USER_ID, "domain": "instagram.com", "duration_seconds": 2400, "event_type": "tab_active", "scroll_speed": 1050.5, "source": "extension", "timestamp": _ts(5, 22), "created_at": _ts(5, 22)},
        {"id": 6, "user_id": DEMO_USER_ID, "domain": "reddit.com", "duration_seconds": 1500, "event_type": "tab_active", "scroll_speed": 680.0, "source": "extension", "timestamp": _ts(5, 23), "created_at": _ts(5, 23)},
        {"id": 7, "user_id": DEMO_USER_ID, "domain": "docs.google.com", "duration_seconds": 4500, "event_type": "tab_active", "scroll_speed": 50.0, "source": "extension", "timestamp": _ts(4, 10), "created_at": _ts(4, 10)},
        {"id": 8, "user_id": DEMO_USER_ID, "domain": "youtube.com", "duration_seconds": 1800, "event_type": "tab_active", "scroll_speed": 400.0, "source": "extension", "timestamp": _ts(4, 13), "created_at": _ts(4, 13)},
        {"id": 9, "user_id": DEMO_USER_ID, "domain": "instagram.com", "duration_seconds": 2700, "event_type": "tab_active", "scroll_speed": 875.0, "source": "extension", "timestamp": _ts(4, 22), "created_at": _ts(4, 22)},
        {"id": 10, "user_id": DEMO_USER_ID, "domain": "twitter.com", "duration_seconds": 3600, "event_type": "tab_active", "scroll_speed": 820.0, "source": "extension", "timestamp": _ts(3, 21), "created_at": _ts(3, 21)},
        {"id": 11, "user_id": DEMO_USER_ID, "domain": "youtube.com", "duration_seconds": 2100, "event_type": "tab_active", "scroll_speed": 350.0, "source": "extension", "timestamp": _ts(3, 15), "created_at": _ts(3, 15)},
        {"id": 12, "user_id": DEMO_USER_ID, "domain": "instagram.com", "duration_seconds": 3200, "event_type": "tab_active", "scroll_speed": 960.0, "source": "extension", "timestamp": _ts(2, 22), "created_at": _ts(2, 22)},
        {"id": 13, "user_id": DEMO_USER_ID, "domain": "tiktok.com", "duration_seconds": 2400, "event_type": "tab_active", "scroll_speed": 1200.0, "source": "extension", "timestamp": _ts(2, 23), "created_at": _ts(2, 23)},
        {"id": 14, "user_id": DEMO_USER_ID, "domain": "youtube.com", "duration_seconds": 2700, "event_type": "tab_active", "scroll_speed": 310.0, "source": "extension", "timestamp": _ts(1, 14), "created_at": _ts(1, 14)},
        {"id": 15, "user_id": DEMO_USER_ID, "domain": "instagram.com", "duration_seconds": 1800, "event_type": "tab_active", "scroll_speed": 890.0, "source": "extension", "timestamp": _ts(1, 21), "created_at": _ts(1, 21)},
        {"id": 16, "user_id": DEMO_USER_ID, "domain": "docs.google.com", "duration_seconds": 3600, "event_type": "tab_active", "scroll_speed": 45.0, "source": "extension", "timestamp": _ts(1, 11), "created_at": _ts(1, 11)},
        {"id": 17, "user_id": DEMO_USER_ID, "domain": "youtube.com", "duration_seconds": 1200, "event_type": "tab_active", "scroll_speed": 400.0, "source": "extension", "timestamp": _ts(0, 10), "created_at": _ts(0, 10)},
        {"id": 18, "user_id": DEMO_USER_ID, "domain": "instagram.com", "duration_seconds": 900, "event_type": "tab_active", "scroll_speed": 780.0, "source": "extension", "timestamp": _ts(0, 11), "created_at": _ts(0, 11)},
    ]

    return {
        "usage_events": usage_events,
        "survey_responses": [
            {
                "id": "66666666-7777-8888-9999-aaaaaaaaaaaa",
                "user_id": DEMO_USER_ID,
                "survey_type": "phq9",
                "responses": {"q1": 2, "q2": 1, "q3": 2, "q4": 2, "q5": 1, "q6": 0, "q7": 1, "q8": 0, "q9": 0},
                "total_score": 9,
                "created_at": f"{seven_days_ago}T12:00:00+00:00",
            },
            {
                "id": "77777777-8888-9999-aaaa-bbbbbbbbbbbb",
                "user_id": DEMO_USER_ID,
                "survey_type": "gad7",
                "responses": {"q1": 2, "q2": 1, "q3": 1, "q4": 2, "q5": 0, "q6": 1, "q7": 1},
                "total_score": 8,
                "created_at": f"{seven_days_ago}T12:05:00+00:00",
            },
        ],
        "habits": [
            {
                "id": HABIT_ID,
                "user_id": DEMO_USER_ID,
                "name": "Sin teléfono la primera hora del día",
                "playbook_slug": "nocturnal-use-pattern",
                "frequency": "daily",
                "active": True,
                "created_at": _ts(10, 8),
            }
        ],
        "habit_completions": [],
        "streaks": [
            {
                "id": "88888888-9999-aaaa-bbbb-cccccccccccc",
                "habit_id": HABIT_ID,
                "user_id": DEMO_USER_ID,
                "current_streak": 3,
                "longest_streak": 5,
                "last_completion": three_days_ago,
                "grace_days_used": 0,
            }
        ],
        "ml_results": [
            {
                "id": 1,
                "user_id": DEMO_USER_ID,
                "model_type": "isolation_forest",
                "result": {
                    "anomaly_score": -0.31,
                    "is_anomaly": True,
                    "risk_level": "medium",
                    "flagged_features": ["nocturnal_ratio", "scroll_speed_avg"],
                },
                "computed_at": f"{date.today().isoformat()}T00:00:00",
            },
            {
                "id": 2,
                "user_id": DEMO_USER_ID,
                "model_type": "xgboost_mood",
                "result": {
                    "predicted_phq9_change": 1.8,
                    "direction": "increase",
                    "confidence": 0.68,
                    "risk_window_days": 7,
                    "nocturnal_pattern_score": 0.72,
                    "doomscrolling_score": 0.31,
                    "attention_fragmentation_score": 0.44,
                },
                "computed_at": f"{date.today().isoformat()}T00:00:00",
            },
        ],
        "daily_features": [
            {
                "user_id": DEMO_USER_ID,
                "date": date.today().isoformat(),
                "total_usage_min": 35.0,
                "nocturnal_min": 0.0,
                "nocturnal_ratio": 0.15,
                "social_ratio": 0.62,
                "productive_ratio": 0.18,
                "avg_scroll_speed": 590.0,
                "session_count": 18,
                "max_session_min": 75.0,
                "app_switches_per_hour": 4.2,
                "app_switches": 12,
                "scroll_distance_km": 0.8,
                "notification_count": 3,
                "phq9_score": 9.0,
                "gad7_score": 8.0,
                "anomaly_score": -0.31,
                "streak_adherence_rate": 0.75,
                "created_at": _ts(0, 6),
                "updated_at": _ts(0, 6),
            }
        ],
        "playbooks": [
            {
                "id": PLAYBOOK_ID,
                "slug": "nocturnal-use-pattern",
                "title": "Patrón de uso nocturno",
                "signal_type": "behavioral",
                "content": "Guía para reducir uso nocturno de pantallas.",
                "activates_when": "nocturnal_ratio > 0.3",
                "crisis_escalation": False,
                "created_at": _ts(30, 9),
            }
        ],
        "playbook_chunks": [
            {
                "id": "99999999-aaaa-bbbb-cccc-dddddddddddd",
                "playbook_id": PLAYBOOK_ID,
                "chunk_text": "El uso nocturno de pantallas puede afectar el sueño.",
                "embedding": None,
                "chunk_index": 0,
            }
        ],
        "weekly_reports": [
            {
                "id": WEEKLY_REPORT_ID,
                "user_id": DEMO_USER_ID,
                "week_start": week_start,
                "narrative": "Esta semana tu uso digital fue mayormente nocturno.",
                "metrics": {
                    "total_minutes": 420,
                    "daily_average_minutes": 60,
                    "top_domains": [{"domain": "instagram.com", "minutes": 120}],
                    "days_with_data": 7,
                    "nocturnal_minutes": 95,
                },
                "created_at": _ts(0, 7),
            }
        ],
        "intervention_log": [
            {
                "id": INTERVENTION_ID,
                "user_id": DEMO_USER_ID,
                "trigger_type": "ml_anomaly",
                "playbook_slug": "nocturnal-use-pattern",
                "shown_at": _ts(1, 20),
                "acted_upon": False,
            }
        ],
        "notifications": [
            {
                "id": NOTIFICATION_ID,
                "user_id": DEMO_USER_ID,
                "type": "weekly_report",
                "title": "Tu reporte semanal está listo",
                "body": "Revisa cómo fue tu semana digital.",
                "read": False,
                "created_at": _ts(0, 8),
            }
        ],
    }


def build_empty_tables() -> dict[str, list[dict[str, Any]]]:
    return {table: [] for table in build_demo_tables().keys()}
