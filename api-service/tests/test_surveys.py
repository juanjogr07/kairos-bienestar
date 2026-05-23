from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def test_submit_phq9():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "test-uuid", "created_at": "2026-05-23T00:00:00+00:00"}]
    )

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.surveys.supabase", mock_db):
        response = client.post(
            "/api/v1/surveys/phq9",
            json={
                "responses": {"q1": 2, "q2": 1, "q3": 0, "q4": 2, "q5": 1, "q6": 0, "q7": 1, "q8": 2, "q9": 0},
                "total_score": 9,
            },
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    assert "id" in response.json()


def test_submit_gad7():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "test-uuid-gad7", "created_at": "2026-05-23T00:00:00+00:00"}]
    )

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.surveys.supabase", mock_db):
        response = client.post(
            "/api/v1/surveys/gad7",
            json={
                "responses": {"q1": 2, "q2": 1, "q3": 1, "q4": 2, "q5": 0, "q6": 1, "q7": 1},
                "total_score": 8,
            },
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    assert "id" in response.json()


def test_invalid_survey_type():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.surveys.supabase", mock_db):
        response = client.post(
            "/api/v1/surveys/invalidtype",
            json={"responses": {}, "total_score": 0},
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 400


def test_invalid_response_value():
    """Score fuera de rango (0-3) debe fallar validación Pydantic."""
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.surveys.supabase", mock_db):
        response = client.post(
            "/api/v1/surveys/phq9",
            json={"responses": {"q1": 5}, "total_score": 5},
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 422
