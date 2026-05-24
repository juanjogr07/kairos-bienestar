from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from datetime import date, timedelta


def _mock_auth():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-id"))
    return mock_db


def _week_start() -> str:
    today = date.today()
    return (today - timedelta(days=today.weekday())).isoformat()


def _make_metrics_dict():
    return {
        "total_minutes": 120,
        "daily_average_minutes": 17,
        "top_domains": [{"domain": "youtube.com", "minutes": 60}],
        "days_with_data": 7,
        "nocturnal_minutes": 10,
    }


def test_weekly_report_requires_auth():
    from main import app
    client = TestClient(app)
    response = client.get("/api/v1/reports/weekly")
    assert response.status_code == 403


def test_weekly_report_returns_existing():
    from main import app
    client = TestClient(app)
    mock_db = _mock_auth()

    week_start = _week_start()
    existing_row = {
        "id": "report-uuid",
        "week_start": week_start,
        "metrics": _make_metrics_dict(),
        "narrative": "Un resumen de prueba.",
        "created_at": "2026-05-23T00:00:00+00:00",
    }

    mock_supabase = MagicMock()
    mock_result = MagicMock()
    mock_result.data = [existing_row]
    (mock_supabase.table.return_value
     .select.return_value.eq.return_value.eq.return_value
     .limit.return_value.execute.return_value) = mock_result

    with patch("auth.supabase", mock_db), patch("routers.reports.supabase", mock_supabase):
        response = client.get(
            "/api/v1/reports/weekly",
            headers={"Authorization": "Bearer testtoken"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == "report-uuid"
    assert body["week_start"] == week_start
    assert body["narrative"] == "Un resumen de prueba."
    assert body["metrics"]["total_minutes"] == 120


def test_weekly_history_requires_auth():
    from main import app
    client = TestClient(app)
    response = client.get("/api/v1/reports/weekly/history")
    assert response.status_code == 403


def test_weekly_history_returns_list():
    from main import app
    client = TestClient(app)
    mock_db = _mock_auth()

    mock_supabase = MagicMock()
    mock_result = MagicMock()
    mock_result.data = []
    (mock_supabase.table.return_value
     .select.return_value.eq.return_value
     .order.return_value.limit.return_value.execute.return_value) = mock_result

    with patch("auth.supabase", mock_db), patch("routers.reports.supabase", mock_supabase):
        response = client.get(
            "/api/v1/reports/weekly/history",
            headers={"Authorization": "Bearer testtoken"},
        )

    assert response.status_code == 200
    assert response.json() == []


def test_recommendations_requires_auth():
    from main import app
    client = TestClient(app)
    response = client.get("/api/v1/habits/recommendations")
    assert response.status_code == 403


def test_recommendations_returns_list():
    from main import app
    client = TestClient(app)
    mock_db = _mock_auth()

    mock_supabase = MagicMock()
    empty_result = MagicMock()
    empty_result.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .eq.return_value.order.return_value.limit.return_value.execute.return_value = empty_result
    mock_supabase.table.return_value.select.return_value.eq.return_value \
        .eq.return_value.execute.return_value = empty_result

    with patch("auth.supabase", mock_db), patch("routers.reports.supabase", mock_supabase):
        response = client.get(
            "/api/v1/habits/recommendations",
            headers={"Authorization": "Bearer testtoken"},
        )

    assert response.status_code == 200
    body = response.json()
    assert "recommendations" in body
    assert isinstance(body["recommendations"], list)
