from unittest.mock import patch, MagicMock
from datetime import date, timedelta
import importlib
import sys


def _make_mock_db():
    mock_db = MagicMock()
    return mock_db


def test_first_completion():
    mock_db = _make_mock_db()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()

    with patch("database.get_supabase", return_value=mock_db), \
         patch("database._client", mock_db):
        import services.streak_engine as se
        # Force re-read of supabase from module
        with patch.object(se, "supabase", mock_db):
            result = se.calculate_streak_after_completion("user-1", "habit-1")

    assert result["streak"] == 1
    assert "Primer día" in result["message"]


def test_consecutive_day():
    mock_db = _make_mock_db()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"current_streak": 3, "longest_streak": 3, "last_completion": yesterday, "grace_days_used": 0}]
    )
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    import services.streak_engine as se
    with patch.object(se, "supabase", mock_db):
        result = se.calculate_streak_after_completion("user-1", "habit-1")

    assert result["streak"] == 4


def test_already_completed_today():
    mock_db = _make_mock_db()
    today = date.today().isoformat()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"current_streak": 5, "longest_streak": 5, "last_completion": today, "grace_days_used": 0}]
    )

    import services.streak_engine as se
    with patch.object(se, "supabase", mock_db):
        result = se.calculate_streak_after_completion("user-1", "habit-1")

    assert result["streak"] == 5
    assert "Ya registraste" in result["message"]


def test_broken_streak():
    mock_db = _make_mock_db()
    three_days_ago = (date.today() - timedelta(days=3)).isoformat()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"current_streak": 10, "longest_streak": 10, "last_completion": three_days_ago, "grace_days_used": 1}]
    )
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()

    import services.streak_engine as se
    with patch.object(se, "supabase", mock_db):
        result = se.calculate_streak_after_completion("user-1", "habit-1")

    assert result["streak"] == 1
    assert "Nuevo comienzo" in result["message"]
