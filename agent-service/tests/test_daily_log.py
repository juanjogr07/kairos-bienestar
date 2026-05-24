from unittest.mock import patch, MagicMock
from datetime import date


def _mock_supa_upsert():
    m = MagicMock()
    m.table.return_value.upsert.return_value.execute.return_value.data = [{"id": 1}]
    m.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value.data = []
    return m


def test_upsert_daily_log_calls_supabase():
    from agent import daily_log as dl
    mock_supa = _mock_supa_upsert()
    with patch.object(dl, "supabase", mock_supa):
        dl.upsert_daily_log("u1", {"morning_mood": 4, "sleep_quality": 3})
    mock_supa.table.assert_called_with("daily_features")
    call_args = mock_supa.table.return_value.upsert.call_args[0][0]
    assert call_args["user_id"] == "u1"
    assert call_args["features"]["morning_mood"] == 4
    assert call_args["date"] == str(date.today())


def test_read_daily_log_returns_empty_when_no_row():
    from agent import daily_log as dl
    mock_supa = _mock_supa_upsert()
    with patch.object(dl, "supabase", mock_supa):
        result = dl.read_today_log("u1")
    assert result == {}


def test_read_daily_log_returns_features():
    from agent import daily_log as dl
    mock_supa = _mock_supa_upsert()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value.data = [
        {"features": {"morning_mood": 3, "sleep_hours": 6.5}, "date": str(date.today())}
    ]
    with patch.object(dl, "supabase", mock_supa):
        result = dl.read_today_log("u1")
    assert result["morning_mood"] == 3
    assert result["sleep_hours"] == 6.5


def test_upsert_merges_existing_features():
    """upsert_daily_log should merge with existing features, not overwrite."""
    from agent import daily_log as dl
    existing = {"morning_mood": 4, "sleep_quality": 3}
    mock_supa = _mock_supa_upsert()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value.data = [
        {"features": existing, "date": str(date.today())}
    ]
    with patch.object(dl, "supabase", mock_supa):
        dl.upsert_daily_log("u1", {"screen_hours": 3.5})
    upserted = mock_supa.table.return_value.upsert.call_args[0][0]
    assert upserted["features"]["morning_mood"] == 4    # preserved
    assert upserted["features"]["screen_hours"] == 3.5  # added
