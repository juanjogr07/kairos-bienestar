"""Tests para GET /api/v1/dashboard/weekly-usage (US-API-001)."""

from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from datetime import date, timedelta


def _mock_db_with_events(events_data):
    """Crea un mock de Supabase con datos de usage_events."""
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))

    # Configurar la cadena de llamadas de Supabase
    chain = mock_db.table.return_value.select.return_value
    chain.eq.return_value.gte.return_value.execute.return_value = MagicMock(data=events_data)

    return mock_db


def test_weekly_usage_returns_7_days():
    """Debe retornar exactamente 7 items siempre."""
    mock_db = _mock_db_with_events([])

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.dashboard.supabase", mock_db):
        response = client.get(
            "/api/v1/dashboard/weekly-usage",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 7


def test_weekly_usage_zero_filled():
    """Cuando no hay eventos, todos los minutos deben ser 0."""
    mock_db = _mock_db_with_events([])

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.dashboard.supabase", mock_db):
        response = client.get(
            "/api/v1/dashboard/weekly-usage",
            headers={"Authorization": "Bearer test-token"},
        )

    data = response.json()
    for item in data:
        assert item["minutes"] == 0


def test_weekly_usage_labels_spanish():
    """Los labels deben ser abreviaciones en español."""
    valid_labels = {"Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"}
    mock_db = _mock_db_with_events([])

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.dashboard.supabase", mock_db):
        response = client.get(
            "/api/v1/dashboard/weekly-usage",
            headers={"Authorization": "Bearer test-token"},
        )

    data = response.json()
    for item in data:
        assert item["label"] in valid_labels


def test_weekly_usage_aggregates_data():
    """Debe sumar correctamente los segundos y convertir a minutos."""
    today = date.today()
    yesterday = (today - timedelta(days=1)).isoformat()

    events_data = [
        {"timestamp": f"{yesterday}T10:00:00Z", "duration_seconds": 120},
        {"timestamp": f"{yesterday}T14:30:00Z", "duration_seconds": 180},
    ]
    mock_db = _mock_db_with_events(events_data)

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.dashboard.supabase", mock_db):
        response = client.get(
            "/api/v1/dashboard/weekly-usage",
            headers={"Authorization": "Bearer test-token"},
        )

    data = response.json()
    yesterday_item = next(item for item in data if item["day"] == yesterday)
    # 120 + 180 = 300 seconds = 5 minutes
    assert yesterday_item["minutes"] == 5


def test_weekly_usage_requires_auth():
    """Debe requerir JWT válido."""
    from main import app
    client = TestClient(app)

    response = client.get("/api/v1/dashboard/weekly-usage")
    assert response.status_code == 403


def test_weekly_usage_days_ordered():
    """Los días deben ir del más antiguo al más reciente."""
    mock_db = _mock_db_with_events([])

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.dashboard.supabase", mock_db):
        response = client.get(
            "/api/v1/dashboard/weekly-usage",
            headers={"Authorization": "Bearer test-token"},
        )

    data = response.json()
    days = [item["day"] for item in data]
    assert days == sorted(days)
