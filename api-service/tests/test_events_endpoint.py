from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def _make_app_client(mock_db):
    """Create a test client with Supabase fully mocked."""
    with patch("database.get_supabase", return_value=mock_db):
        import importlib
        import main as main_mod
        importlib.reload(main_mod)
        from main import app
        return TestClient(app)


def test_ingest_events():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.events.supabase", mock_db):
        response = client.post(
            "/api/v1/events/batch",
            json={
                "events": [
                    {
                        "domain": "youtube.com",
                        "duration_seconds": 120,
                        "event_type": "tab_active",
                        "timestamp": "2026-05-23T14:30:00Z",
                    }
                ]
            },
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    assert response.json()["received"] == 1


def test_empty_batch():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.events.supabase", mock_db):
        response = client.post(
            "/api/v1/events/batch",
            json={"events": []},
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    assert response.json()["received"] == 0


def test_domain_sanitized_on_ingest():
    """www prefix must be stripped before storage."""
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-user-uuid"))
    inserted_rows = []

    def capture_insert(rows):
        inserted_rows.extend(rows)
        return MagicMock(execute=lambda: MagicMock())

    mock_db.table.return_value.insert.side_effect = capture_insert

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.events.supabase", mock_db):
        client.post(
            "/api/v1/events/batch",
            json={
                "events": [
                    {
                        "domain": "www.Instagram.com",
                        "duration_seconds": 60,
                        "event_type": "tab_active",
                        "timestamp": "2026-05-23T14:30:00Z",
                    }
                ]
            },
            headers={"Authorization": "Bearer test-token"},
        )

    assert inserted_rows[0]["domain"] == "instagram.com"
