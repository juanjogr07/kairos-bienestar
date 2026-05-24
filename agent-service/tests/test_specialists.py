from agent.user_context import UserContext


def _ctx(**kwargs):
    return UserContext(user_id="u1", **kwargs)


def test_base_specialist_interface():
    from agent.specialists.base import BaseSpecialist
    import pytest
    with pytest.raises(TypeError):
        BaseSpecialist()


def test_morning_agent_activates_before_11am_no_checkin():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(checkin_done=False)
    agent = MorningAgent()
    assert agent.should_activate(ctx, hour=9) is True


def test_morning_agent_does_not_activate_after_checkin():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(checkin_done=True)
    agent = MorningAgent()
    assert agent.should_activate(ctx, hour=9) is False


def test_morning_agent_does_not_activate_after_11am():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(checkin_done=False)
    agent = MorningAgent()
    assert agent.should_activate(ctx, hour=12) is False


def test_mood_agent_activates_on_crisis():
    from agent.specialists.mood_agent import MoodAgent
    ctx = _ctx(phq9_current=16.0)
    agent = MoodAgent()
    assert agent.should_activate(ctx) is True


def test_mood_agent_activates_on_low_morning_mood():
    from agent.specialists.mood_agent import MoodAgent
    ctx = _ctx(morning_mood=2)
    agent = MoodAgent()
    assert agent.should_activate(ctx) is True


def test_fuel_agent_activates_on_block_flag():
    from agent.specialists.fuel_agent import FuelAgent
    ctx = _ctx(hours_since_meal=9.0)
    agent = FuelAgent()
    assert agent.should_activate(ctx) is True


def test_sleep_agent_activates_on_sleep_block():
    from agent.specialists.sleep_agent import SleepAgent
    ctx = _ctx(sleep_hours=4.0, is_evening=True)
    agent = SleepAgent()
    assert agent.should_activate(ctx) is True


def test_specialist_system_prompt_contains_phase():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(days_active=20)
    agent = MorningAgent()
    prompt = agent.system_prompt(ctx)
    assert "Fase 2" in prompt or "fase 2" in prompt.lower()


def test_morning_agent_streak_paused_message():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(days_since_active=4, current_streak=5)
    agent = MorningAgent()
    prompt = agent.system_prompt(ctx)
    assert "pasó" in prompt or "qué pasó" in prompt.lower()


# ── InsightAgent ─────────────────────────────────────────────────────────────

def test_insight_agent_prompt_contains_correlations():
    from agent.specialists.insight_agent import InsightAgent
    ctx = UserContext(user_id="u1", days_active=10)
    agent = InsightAgent()
    prompt = agent.system_prompt(ctx)
    assert "correlacion" in prompt.lower() or "correlación" in prompt.lower()
    assert "sueño" in prompt.lower()
    assert "ánimo" in prompt.lower() or "animo" in prompt.lower()


def test_insight_agent_does_not_activate_before_7_days():
    from agent.specialists.insight_agent import InsightAgent
    ctx = UserContext(user_id="u1", days_active=5)
    agent = InsightAgent()
    assert agent.should_activate(ctx) is False


def test_insight_agent_activates_at_7_days():
    from agent.specialists.insight_agent import InsightAgent
    ctx = UserContext(user_id="u1", days_active=7)
    agent = InsightAgent()
    assert agent.should_activate(ctx) is True


# ── ProgressAgent ─────────────────────────────────────────────────────────────

def test_progress_agent_phase_1_prompt():
    from agent.specialists.progress_agent import ProgressAgent
    ctx = _ctx(days_active=5, current_streak=5)
    agent = ProgressAgent()
    prompt = agent.system_prompt(ctx)
    assert "fase 1" in prompt.lower() or "Fase 1" in prompt


def test_progress_agent_phase_3_does_not_explain_basics():
    from agent.specialists.progress_agent import ProgressAgent
    ctx = _ctx(days_active=70, current_streak=70)
    agent = ProgressAgent()
    prompt = agent.system_prompt(ctx)
    assert "reta" in prompt.lower() or "reto" in prompt.lower() or "autonomía" in prompt.lower()
