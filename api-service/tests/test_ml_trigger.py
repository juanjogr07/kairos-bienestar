from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def _client():
    from main import app
    return TestClient(app)


def _mock_auth():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-id"))
    return mock_db


def test_ml_run_returns_queued():
    from main import app
    client = TestClient(app)
    mock_db = _mock_auth()

    with patch("auth.supabase", mock_db), \
         patch("routers.ml_trigger._run_ml"):
        response = client.post(
            "/api/v1/ml/run",
            headers={"Authorization": "Bearer testtoken"},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "queued"
    assert body["user_id"] == "test-user-id"
    assert "isolation_forest" in body["models_run"]
    assert "xgboost_mood" in body["models_run"]


def test_ml_run_requires_auth():
    from main import app
    client = TestClient(app)
    response = client.post("/api/v1/ml/run")
    assert response.status_code == 403


def test_ml_run_method_not_allowed():
    from main import app
    client = TestClient(app)
    mock_db = _mock_auth()

    with patch("auth.supabase", mock_db):
        response = client.get(
            "/api/v1/ml/run",
            headers={"Authorization": "Bearer testtoken"},
        )
    assert response.status_code == 405
