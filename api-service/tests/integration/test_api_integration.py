"""
End-to-end API integration tests using fake Supabase data seeded from SQL schemas.
"""
from __future__ import annotations

from datetime import date, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from services.ml.runner import run_all_models_for_user
from services.notification_service import check_habit_reminders
from tests.integration.conftest import AUTH_HEADERS, patch_supabase
from tests.integration.fake_supabase import FakeSupabase
from tests.integration.seed_data import (
    DEMO_USER_ID,
    HABIT_ID,
    INTERVENTION_ID,
    NOTIFICATION_ID,
    build_demo_tables,
    build_empty_tables,
)


@pytest.fixture
def seeded_db() -> FakeSupabase:
    return FakeSupabase(user_id=DEMO_USER_ID, tables=build_demo_tables())


@pytest.fixture
def client(seeded_db: FakeSupabase):
    from main import app

    with patch_supabase(seeded_db):
        yield TestClient(app), seeded_db


class TestEventsIntegration:
    def test_batch_ingest_persists_usage_events(self, client) -> None:
        test_client, db = client
        before = db.count("usage_events")

        response = test_client.post(
            "/api/v1/events/batch",
            json={
                "events": [
                    {
                        "domain": "github.com",
                        "duration_seconds": 300,
                        "event_type": "tab_active",
                        "timestamp": "2026-05-24T09:00:00Z",
                    }
                ]
            },
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        assert response.json()["received"] == 1
        assert db.count("usage_events") == before + 1
        assert db.rows("usage_events")[-1]["domain"] == "github.com"


class TestSurveysIntegration:
    def test_submit_ema_survey(self, client) -> None:
        test_client, db = client
        response = test_client.post(
            "/api/v1/surveys/ema",
            json={"responses": {"mood": 3, "energy": 2}, "total_score": 5},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        assert "id" in response.json()
        ema_rows = [
            row for row in db.rows("survey_responses") if row["survey_type"] == "ema"
        ]
        assert len(ema_rows) == 1


class TestDashboardIntegration:
    def test_dashboard_reflects_seeded_data(self, client) -> None:
        test_client, _db = client
        response = test_client.get("/api/v1/dashboard", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert body["active_habits"] == 1
        assert body["last_phq9_score"] == 9
        assert body["last_gad7_score"] == 8
        assert body["onboarding_completed"] is True
        assert body["today_usage_min"] > 0

    def test_weekly_usage_returns_seven_days(self, client) -> None:
        test_client, _db = client
        response = test_client.get(
            "/api/v1/dashboard/weekly-usage",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 7
        assert any(item["minutes"] > 0 for item in data)

    def test_mini_summary(self, client) -> None:
        test_client, _db = client
        response = test_client.get("/api/v1/user/mini-summary", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert body["today_usage_min"] > 0
        assert body["streak_active"] is True
        assert body["last_intervention"] is not None


class TestHabitsIntegration:
    def test_list_habits_with_streak(self, client) -> None:
        test_client, _db = client
        response = test_client.get("/api/v1/habits", headers=AUTH_HEADERS)

        assert response.status_code == 200
        habits = response.json()
        assert len(habits) == 1
        assert habits[0]["id"] == HABIT_ID
        assert habits[0]["current_streak"] == 3
        assert habits[0]["completed_today"] is False

    def test_create_habit(self, client) -> None:
        test_client, db = client
        response = test_client.post(
            "/api/v1/habits",
            json={
                "name": "Caminata de 15 minutos",
                "playbook_slug": "low-mood-indicators",
                "frequency": "daily",
            },
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "Caminata de 15 minutos"
        assert body["current_streak"] == 0
        assert db.count("habits") == 2

    def test_complete_habit_updates_streak_and_completion(self, client) -> None:
        test_client, db = client
        before_completions = db.count("habit_completions")

        response = test_client.post(
            f"/api/v1/habits/{HABIT_ID}/complete",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["streak"] == 1
        assert body["broken"] is True
        assert db.count("habit_completions") == before_completions + 1

        streak = (
            db.table("streaks")
            .select("current_streak, last_completion")
            .eq("habit_id", HABIT_ID)
            .execute()
        ).data[0]
        assert streak["current_streak"] == 1
        assert streak["last_completion"] == date.today().isoformat()


class TestReportsIntegration:
    def test_weekly_report_returns_existing_seed(self, client) -> None:
        test_client, _db = client
        response = test_client.get("/api/v1/reports/weekly", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert body["metrics"]["total_minutes"] == 420
        assert "nocturno" in body["narrative"]

    def test_weekly_history(self, client) -> None:
        test_client, _db = client
        response = test_client.get(
            "/api/v1/reports/weekly/history",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        history = response.json()
        assert len(history) == 1

    def test_habit_recommendations_from_ml(self, client) -> None:
        test_client, _db = client
        response = test_client.get(
            "/api/v1/habits/recommendations",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        body = response.json()
        assert body["playbook_slug"] == "nocturnal-use-pattern"
        # El demo user ya tiene un hábito activo de ese playbook → lista vacía es correcto.
        assert isinstance(body["recommendations"], list)
        assert body["recommendations"] == []

    def test_habit_recommendations_when_playbook_not_active(self) -> None:
        db = FakeSupabase(user_id=DEMO_USER_ID, tables=build_empty_tables())
        db.table("ml_results").insert(
            {
                "user_id": DEMO_USER_ID,
                "model_type": "xgboost_mood",
                "result": {
                    "nocturnal_pattern_score": 0.9,
                    "doomscrolling_score": 0.1,
                    "attention_fragmentation_score": 0.1,
                },
            }
        ).execute()

        from main import app

        with patch_supabase(db):
            client = TestClient(app)
            response = client.get(
                "/api/v1/habits/recommendations",
                headers=AUTH_HEADERS,
            )

        assert response.status_code == 200
        body = response.json()
        assert body["playbook_slug"] == "nocturnal-use-pattern"
        assert len(body["recommendations"]) >= 1


class TestInterventionsIntegration:
    def test_list_interventions(self, client) -> None:
        test_client, _db = client
        response = test_client.get("/api/v1/interventions", headers=AUTH_HEADERS)

        assert response.status_code == 200
        items = response.json()
        assert len(items) == 1
        assert items[0]["id"] == INTERVENTION_ID
        assert items[0]["acted_upon"] is False

    def test_log_and_mark_intervention(self, client) -> None:
        test_client, db = client
        created = test_client.post(
            "/api/v1/interventions",
            json={
                "trigger_type": "agent_suggestion",
                "playbook_slug": "doomscrolling",
            },
            headers=AUTH_HEADERS,
        )

        assert created.status_code == 200
        intervention_id = created.json()["id"]

        acted = test_client.post(
            f"/api/v1/interventions/{intervention_id}/act",
            headers=AUTH_HEADERS,
        )
        assert acted.status_code == 200

        row = (
            db.table("intervention_log")
            .select("acted_upon")
            .eq("id", intervention_id)
            .execute()
        ).data[0]
        assert row["acted_upon"] is True


class TestNotificationsIntegration:
    def test_list_unread_notifications(self, client) -> None:
        test_client, _db = client
        response = test_client.get("/api/v1/notifications", headers=AUTH_HEADERS)

        assert response.status_code == 200
        items = response.json()
        assert any(item["id"] == NOTIFICATION_ID for item in items)

    def test_mark_notification_read(self, client) -> None:
        test_client, db = client
        response = test_client.post(
            f"/api/v1/notifications/{NOTIFICATION_ID}/read",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        assert response.json()["success"] is True

        row = (
            db.table("notifications")
            .select("read")
            .eq("id", NOTIFICATION_ID)
            .execute()
        ).data[0]
        assert row["read"] is True


class TestNotificationServiceIntegration:
    def test_check_habit_reminders_creates_notification(self, seeded_db: FakeSupabase) -> None:
        with patch_supabase(seeded_db):
            before = seeded_db.count("notifications")
            check_habit_reminders(DEMO_USER_ID)

        assert seeded_db.count("notifications") == before + 1
        latest = seeded_db.rows("notifications")[-1]
        assert latest["type"] == "habit_reminder"
        assert "Sin teléfono" in latest["body"]


class TestMlRunnerIntegration:
    def test_run_all_models_with_seeded_events(self, seeded_db: FakeSupabase) -> None:
        with patch_supabase(seeded_db):
            results = run_all_models_for_user(DEMO_USER_ID, seeded_db)

        assert "isolation_forest" in results
        assert "xgboost_mood" in results
        assert results["isolation_forest"]["risk_level"] in ("low", "medium", "high")
        assert results["xgboost_mood"]["direction"] in ("increase", "decrease", "stable")

        ml_rows = [
            row
            for row in seeded_db.rows("ml_results")
            if row["computed_at"].startswith(date.today().isoformat())
        ]
        model_types = {row["model_type"] for row in ml_rows}
        assert "isolation_forest" in model_types
        assert "xgboost_mood" in model_types


class TestMlTriggerIntegration:
    def test_ml_run_queues_background_task(self, client) -> None:
        test_client, _db = client
        with patch("routers.ml_trigger._run_ml") as mock_run:
            response = test_client.post("/api/v1/ml/run", headers=AUTH_HEADERS)

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "queued"
        assert body["user_id"] == DEMO_USER_ID


class TestFullUserJourneyIntegration:
    def test_onboarding_to_dashboard_flow(self) -> None:
        db = FakeSupabase(user_id=DEMO_USER_ID, tables=build_empty_tables())
        from main import app

        with patch_supabase(db):
            client = TestClient(app)

            phq9 = client.post(
                "/api/v1/surveys/phq9",
                json={
                    "responses": {f"q{i}": 1 for i in range(1, 10)},
                    "total_score": 9,
                },
                headers=AUTH_HEADERS,
            )
            gad7 = client.post(
                "/api/v1/surveys/gad7",
                json={
                    "responses": {f"q{i}": 1 for i in range(1, 8)},
                    "total_score": 7,
                },
                headers=AUTH_HEADERS,
            )
            events = client.post(
                "/api/v1/events/batch",
                json={
                    "events": [
                        {
                            "domain": "instagram.com",
                            "duration_seconds": 600,
                            "event_type": "tab_active",
                            "timestamp": f"{date.today().isoformat()}T23:00:00Z",
                        },
                        {
                            "domain": "youtube.com",
                            "duration_seconds": 900,
                            "event_type": "tab_active",
                            "timestamp": f"{date.today().isoformat()}T23:30:00Z",
                        },
                        {
                            "domain": "twitter.com",
                            "duration_seconds": 300,
                            "event_type": "tab_active",
                            "timestamp": f"{(date.today() - timedelta(days=1)).isoformat()}T22:00:00Z",
                        },
                    ]
                },
                headers=AUTH_HEADERS,
            )
            habit = client.post(
                "/api/v1/habits",
                json={
                    "name": "Sin pantallas 30 min antes de dormir",
                    "playbook_slug": "nocturnal-use-pattern",
                },
                headers=AUTH_HEADERS,
            )
            dashboard = client.get("/api/v1/dashboard", headers=AUTH_HEADERS)

        assert phq9.status_code == 200
        assert gad7.status_code == 200
        assert events.status_code == 200
        assert habit.status_code == 200
        assert dashboard.status_code == 200
        assert dashboard.json()["onboarding_completed"] is True
        assert dashboard.json()["active_habits"] == 1
