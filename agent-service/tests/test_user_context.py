import sys
from unittest.mock import patch, MagicMock
from datetime import date


def _make_daily_features(features: dict):
    row = MagicMock()
    row.data = [{"features": features, "date": str(date.today())}]
    return row


def test_user_context_defaults():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1")
    assert ctx.user_phase == 1
    assert ctx.fuel_block_flag is False
    assert ctx.sleep_block_flag is False
    assert ctx.crisis_flag is False
    assert ctx.days_active == 0


def test_phase_calculation():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_active=5)
    assert ctx.user_phase == 1
    ctx2 = UserContext(user_id="u1", days_active=20)
    assert ctx2.user_phase == 2
    ctx3 = UserContext(user_id="u1", days_active=65)
    assert ctx3.user_phase == 3


def test_fuel_block_flag_computed():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", hours_since_meal=9.0)
    assert ctx.fuel_block_flag is True
    ctx2 = UserContext(user_id="u1", hours_since_meal=7.5)
    assert ctx2.fuel_block_flag is False


def test_sleep_block_flag_computed():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", sleep_hours=4.0, is_evening=True)
    assert ctx.sleep_block_flag is True
    ctx2 = UserContext(user_id="u1", sleep_hours=4.0, is_evening=False)
    assert ctx2.sleep_block_flag is False


def test_crisis_flag_from_surveys():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", phq9_current=16.0)
    assert ctx.crisis_flag is True
    ctx2 = UserContext(user_id="u1", phq9_current=14.0)
    assert ctx2.crisis_flag is False


def test_pause_streak_when_absent_3_days():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_since_active=3, current_streak=7)
    assert ctx.streak_paused is True
    ctx2 = UserContext(user_id="u1", days_since_active=2, current_streak=7)
    assert ctx2.streak_paused is False
