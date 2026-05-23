from datetime import date, timedelta
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

USER_ID = "test-user-uuid"
HABIT_ID = "habit-1"
AUTH_HEADERS = {"Authorization": "Bearer test-token"}


def _make_mock_db():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id=USER_ID))
    return mock_db


def _client():
    from main import app

    return TestClient(app)


def _complete_habit(mock_db):
    with patch("auth.supabase", mock_db), patch("routers.habits.supabase", mock_db):
        return _client().post(
            f"/api/v1/habits/{HABIT_ID}/complete",
            headers=AUTH_HEADERS,
        )


def test_complete_habit_requires_auth():
    response = _client().post(f"/api/v1/habits/{HABIT_ID}/complete")
    assert response.status_code == 403


def test_complete_habit_inserts_completion():
    mock_db = _make_mock_db()
    inserted_rows = []

    def capture_insert(row):
        inserted_rows.append(row)
        return MagicMock(execute=lambda: MagicMock())

    mock_db.table.return_value.insert.side_effect = capture_insert
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    response = _complete_habit(mock_db)

    assert response.status_code == 200
    completion_rows = [row for row in inserted_rows if "user_id" in row and "current_streak" not in row]
    assert completion_rows == [{"habit_id": HABIT_ID, "user_id": USER_ID}]


def test_complete_habit_first_completion():
    mock_db = _make_mock_db()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

    response = _complete_habit(mock_db)

    assert response.status_code == 200
    assert response.json() == {
        "streak": 1,
        "used_grace_day": False,
        "broken": False,
    }


def test_complete_habit_consecutive_day():
    mock_db = _make_mock_db()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{
            "current_streak": 3,
            "longest_streak": 3,
            "last_completion": yesterday,
            "grace_days_used": 0,
            "grace_days_allowed": 1,
        }]
    )
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    response = _complete_habit(mock_db)

    assert response.status_code == 200
    assert response.json() == {
        "streak": 4,
        "used_grace_day": False,
        "broken": False,
    }


def test_complete_habit_already_completed_today():
    mock_db = _make_mock_db()
    today = date.today().isoformat()
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{
            "current_streak": 5,
            "longest_streak": 5,
            "last_completion": today,
            "grace_days_used": 0,
            "grace_days_allowed": 1,
        }]
    )

    response = _complete_habit(mock_db)

    assert response.status_code == 200
    assert response.json() == {
        "streak": 5,
        "used_grace_day": False,
        "broken": False,
    }
