from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def test_health_no_auth():
    from main import app
    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_events_requires_auth():
    from main import app
    client = TestClient(app)
    response = client.post("/api/v1/events/batch", json={"events": []})
    assert response.status_code == 403


def test_events_invalid_token():
    mock_db = MagicMock()
    mock_db.auth.get_user.side_effect = Exception("invalid token")

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db):
        response = client.post(
            "/api/v1/events/batch",
            json={"events": []},
            headers={"Authorization": "Bearer invalid_token"},
        )

    assert response.status_code == 401
