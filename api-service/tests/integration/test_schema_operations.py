"""
Integration tests for all database table operations using fake in-memory data.

Covers every table from infra/supabase/migrations/001_initial_schema.sql plus
notifications and daily_features.
"""
from __future__ import annotations

from datetime import date, timedelta

import pytest

from tests.integration.fake_supabase import FakeIntegrityError, FakeSupabase
from tests.integration.seed_data import (
    DEMO_USER_ID,
    HABIT_ID,
    INTERVENTION_ID,
    NOTIFICATION_ID,
    build_demo_tables,
    build_empty_tables,
)


@pytest.fixture
def db() -> FakeSupabase:
    return FakeSupabase(user_id=DEMO_USER_ID, tables=build_empty_tables())


class TestUsageEventsOperations:
    def test_insert_batch_and_select_by_user(self, db: FakeSupabase) -> None:
        rows = [
            {
                "user_id": DEMO_USER_ID,
                "domain": "youtube.com",
                "duration_seconds": 120,
                "event_type": "tab_active",
                "timestamp": "2026-05-23T14:30:00",
            },
            {
                "user_id": DEMO_USER_ID,
                "domain": "instagram.com",
                "duration_seconds": 60,
                "event_type": "tab_active",
                "timestamp": "2026-05-23T22:30:00",
            },
        ]
        db.table("usage_events").insert(rows).execute()

        result = (
            db.table("usage_events")
            .select("domain, duration_seconds, timestamp")
            .eq("user_id", DEMO_USER_ID)
            .gte("timestamp", "2026-05-23")
            .execute()
        )

        assert len(result.data) == 2
        assert {row["domain"] for row in result.data} == {"youtube.com", "instagram.com"}


class TestSurveyResponsesOperations:
    def test_insert_phq9_and_gad7(self, db: FakeSupabase) -> None:
        db.table("survey_responses").insert(
            {
                "user_id": DEMO_USER_ID,
                "survey_type": "phq9",
                "responses": {"q1": 2},
                "total_score": 9,
            }
        ).execute()
        db.table("survey_responses").insert(
            {
                "user_id": DEMO_USER_ID,
                "survey_type": "gad7",
                "responses": {"q1": 1},
                "total_score": 8,
            }
        ).execute()

        phq9 = (
            db.table("survey_responses")
            .select("total_score, survey_type")
            .eq("user_id", DEMO_USER_ID)
            .eq("survey_type", "phq9")
            .execute()
        )
        gad7 = (
            db.table("survey_responses")
            .select("total_score, survey_type")
            .eq("user_id", DEMO_USER_ID)
            .eq("survey_type", "gad7")
            .execute()
        )

        assert phq9.data[0]["total_score"] == 9
        assert gad7.data[0]["total_score"] == 8


class TestHabitsAndStreaksOperations:
    def test_create_habit_and_streak(self, db: FakeSupabase) -> None:
        habit = db.table("habits").insert(
            {
                "user_id": DEMO_USER_ID,
                "name": "Meditar 5 minutos",
                "playbook_slug": "low-mood-indicators",
            }
        ).execute().data[0]

        db.table("streaks").insert(
            {
                "habit_id": habit["id"],
                "user_id": DEMO_USER_ID,
                "current_streak": 1,
                "longest_streak": 1,
                "last_completion": date.today().isoformat(),
            }
        ).execute()

        streak = (
            db.table("streaks")
            .select("*")
            .eq("habit_id", habit["id"])
            .execute()
        ).data[0]

        assert streak["current_streak"] == 1
        assert streak["last_completion"] == date.today().isoformat()

    def test_streak_habit_id_unique_constraint(self, db: FakeSupabase) -> None:
        db.table("streaks").insert(
            {
                "habit_id": HABIT_ID,
                "user_id": DEMO_USER_ID,
                "current_streak": 1,
                "longest_streak": 1,
                "last_completion": date.today().isoformat(),
            }
        ).execute()

        with pytest.raises(FakeIntegrityError):
            db.table("streaks").insert(
                {
                    "habit_id": HABIT_ID,
                    "user_id": DEMO_USER_ID,
                    "current_streak": 2,
                    "longest_streak": 2,
                    "last_completion": date.today().isoformat(),
                }
            ).execute()


class TestHabitCompletionsOperations:
    def test_insert_completion(self, db: FakeSupabase) -> None:
        db.table("habits").insert(
            {
                "id": HABIT_ID,
                "user_id": DEMO_USER_ID,
                "name": "Sin teléfono la primera hora",
            }
        ).execute()

        completion = db.table("habit_completions").insert(
            {"habit_id": HABIT_ID, "user_id": DEMO_USER_ID}
        ).execute().data[0]

        assert completion["habit_id"] == HABIT_ID
        assert completion["user_id"] == DEMO_USER_ID
        assert "completed_at" in completion


class TestMlResultsOperations:
    def test_insert_and_select_latest_by_model(self, db: FakeSupabase) -> None:
        today = date.today().isoformat()
        db.table("ml_results").insert(
            {
                "user_id": DEMO_USER_ID,
                "model_type": "isolation_forest",
                "result": {"risk_level": "medium", "is_anomaly": True},
                "computed_at": f"{today}T00:00:00",
            }
        ).execute()

        result = (
            db.table("ml_results")
            .select("result, model_type")
            .eq("user_id", DEMO_USER_ID)
            .eq("model_type", "isolation_forest")
            .order("computed_at", desc=True)
            .limit(1)
            .execute()
        )

        assert result.data[0]["result"]["risk_level"] == "medium"


class TestDailyFeaturesOperations:
    def test_insert_and_unique_user_date(self, db: FakeSupabase) -> None:
        today = date.today().isoformat()
        db.table("daily_features").insert(
            {
                "user_id": DEMO_USER_ID,
                "date": today,
                "total_usage_min": 45.0,
                "nocturnal_ratio": 0.2,
            }
        ).execute()

        row = (
            db.table("daily_features")
            .select("total_usage_min, nocturnal_ratio")
            .eq("user_id", DEMO_USER_ID)
            .eq("date", today)
            .execute()
        ).data[0]

        assert row["total_usage_min"] == 45.0

        with pytest.raises(FakeIntegrityError):
            db.table("daily_features").insert(
                {
                    "user_id": DEMO_USER_ID,
                    "date": today,
                    "total_usage_min": 99.0,
                }
            ).execute()


class TestPlaybooksOperations:
    def test_insert_playbook_and_chunk(self, db: FakeSupabase) -> None:
        playbook = db.table("playbooks").insert(
            {
                "slug": "doomscrolling",
                "title": "Doomscrolling",
                "content": "Contenido del playbook.",
            }
        ).execute().data[0]

        chunk = db.table("playbook_chunks").insert(
            {
                "playbook_id": playbook["id"],
                "chunk_text": "Fragmento 1",
                "chunk_index": 0,
            }
        ).execute().data[0]

        assert chunk["playbook_id"] == playbook["id"]
        assert chunk["chunk_index"] == 0


class TestWeeklyReportsOperations:
    def test_insert_and_select_by_week(self, db: FakeSupabase) -> None:
        week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()
        db.table("weekly_reports").insert(
            {
                "user_id": DEMO_USER_ID,
                "week_start": week_start,
                "metrics": {"total_minutes": 100},
                "narrative": "Resumen semanal.",
            }
        ).execute()

        result = (
            db.table("weekly_reports")
            .select("*")
            .eq("user_id", DEMO_USER_ID)
            .eq("week_start", week_start)
            .limit(1)
            .execute()
        )

        assert result.data[0]["metrics"]["total_minutes"] == 100


class TestInterventionLogOperations:
    def test_insert_list_and_mark_acted(self, db: FakeSupabase) -> None:
        inserted = db.table("intervention_log").insert(
            {
                "user_id": DEMO_USER_ID,
                "trigger_type": "dashboard_banner",
                "playbook_slug": "nocturnal-use-pattern",
            }
        ).execute().data[0]

        listed = (
            db.table("intervention_log")
            .select("id, trigger_type, acted_upon")
            .eq("user_id", DEMO_USER_ID)
            .order("shown_at", desc=True)
            .limit(20)
            .execute()
        ).data

        assert len(listed) == 1
        assert listed[0]["acted_upon"] is False

        updated = (
            db.table("intervention_log")
            .update({"acted_upon": True})
            .eq("id", inserted["id"])
            .eq("user_id", DEMO_USER_ID)
            .execute()
        ).data[0]

        assert updated["acted_upon"] is True


class TestNotificationsOperations:
    def test_insert_list_unread_and_mark_read(self, db: FakeSupabase) -> None:
        db.table("notifications").insert(
            {
                "id": NOTIFICATION_ID,
                "user_id": DEMO_USER_ID,
                "type": "habit_reminder",
                "title": "¿Cómo va tu hábito?",
                "body": "Llevas 2 días sin completar tu hábito.",
            }
        ).execute()

        unread = (
            db.table("notifications")
            .select("id, type, title, body, created_at")
            .eq("user_id", DEMO_USER_ID)
            .eq("read", False)
            .order("created_at", desc=True)
            .execute()
        ).data

        assert len(unread) == 1
        assert unread[0]["type"] == "habit_reminder"

        marked = (
            db.table("notifications")
            .update({"read": True})
            .eq("id", NOTIFICATION_ID)
            .eq("user_id", DEMO_USER_ID)
            .execute()
        ).data[0]

        assert marked["read"] is True

    def test_duplicate_notification_same_day_blocked(self, db: FakeSupabase) -> None:
        payload = {
            "user_id": DEMO_USER_ID,
            "type": "habit_reminder",
            "title": "Recordatorio",
            "body": "Completa tu hábito.",
        }
        db.table("notifications").insert(payload).execute()

        with pytest.raises(FakeIntegrityError):
            db.table("notifications").insert(payload).execute()


class TestSeededDemoDataIntegrity:
    def test_demo_seed_has_all_tables(self) -> None:
        tables = build_demo_tables()
        expected = {
            "usage_events",
            "survey_responses",
            "habits",
            "habit_completions",
            "streaks",
            "ml_results",
            "daily_features",
            "playbooks",
            "playbook_chunks",
            "weekly_reports",
            "intervention_log",
            "notifications",
        }
        assert set(tables.keys()) == expected

    def test_demo_seed_usage_events_count(self) -> None:
        tables = build_demo_tables()
        assert len(tables["usage_events"]) == 18

    def test_demo_seed_onboarding_surveys_present(self) -> None:
        tables = build_demo_tables()
        types = {row["survey_type"] for row in tables["survey_responses"]}
        assert types == {"phq9", "gad7"}
