from datetime import date

from services.streak_service import calculate_streak_update


def _base_streak(**overrides):
    streak = {
        "current_streak": 5,
        "longest_streak": 10,
        "last_completion": date(2026, 5, 20),
        "grace_days_used": 0,
        "grace_days_allowed": 1,
    }
    streak.update(overrides)
    return streak


def test_gap_one_day_increments_streak_without_grace_day():
    streak = _base_streak(current_streak=3, longest_streak=3)

    result = calculate_streak_update(streak, date(2026, 5, 21))

    assert result["current_streak"] == 4
    assert result["used_grace_day"] is False
    assert result["broken"] is False
    assert result["grace_days_used"] == 0
    assert result["longest_streak"] == 4
    assert result["last_completion"] == date(2026, 5, 21)


def test_gap_two_days_uses_grace_day_when_available():
    streak = _base_streak(grace_days_used=0, grace_days_allowed=1)

    result = calculate_streak_update(streak, date(2026, 5, 22))

    assert result["current_streak"] == 6
    assert result["used_grace_day"] is True
    assert result["broken"] is False
    assert result["grace_days_used"] == 1
    assert result["last_completion"] == date(2026, 5, 22)


def test_gap_two_days_breaks_streak_when_no_grace_days_left():
    streak = _base_streak(grace_days_used=1, grace_days_allowed=1)

    result = calculate_streak_update(streak, date(2026, 5, 22))

    assert result["current_streak"] == 1
    assert result["used_grace_day"] is False
    assert result["broken"] is True
    assert result["grace_days_used"] == 1
    assert result["last_completion"] == date(2026, 5, 22)


def test_gap_greater_than_two_days_breaks_streak_and_resets_grace_days():
    streak = _base_streak(current_streak=10, grace_days_used=1, grace_days_allowed=1)

    result = calculate_streak_update(streak, date(2026, 5, 23))

    assert result["current_streak"] == 1
    assert result["used_grace_day"] is False
    assert result["broken"] is True
    assert result["grace_days_used"] == 0
    assert result["last_completion"] == date(2026, 5, 23)


def test_longest_streak_updated_when_current_exceeds_record():
    streak = _base_streak(current_streak=9, longest_streak=9)

    result = calculate_streak_update(streak, date(2026, 5, 21))

    assert result["current_streak"] == 10
    assert result["longest_streak"] == 10
