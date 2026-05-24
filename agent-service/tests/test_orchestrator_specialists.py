"""
Integration smoke tests for the specialist-routing orchestrator.
All Supabase + LLM calls are mocked.
"""
from unittest.mock import patch, MagicMock
import agent.orchestrator as orch


def _mock_llm_response(text: str):
    choice = MagicMock()
    choice.finish_reason = "stop"
    choice.message.content = text
    choice.message.tool_calls = None
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _surveys(phq9=2, gad7=2, crisis=False):
    return {
        "phq9_score": phq9, "phq9_prev_score": None,
        "phq9_interpretation": "mínimo",
        "gad7_score": gad7, "gad7_prev_score": None,
        "gad7_interpretation": "mínimo",
        "crisis_flag": crisis,
    }


def _ml_zero():
    return {
        "attention_fragmentation_score": 0.3,
        "nocturnal_pattern_score": 0.3,
        "doomscrolling_score": 0.3,
        "anomaly_flag": False,
        "anomaly_severity": 0.0,
        "has_ml_data": False,
    }


def _usage_empty():
    return {"top_domains": [], "today_minutes": 0, "avg_daily_minutes": 0, "days_with_data": 0}


def _forecast():
    return {"relapse_risk_score": 0.0, "trend_direction": "stable", "has_forecast": False}


def _patch_all(phq9=2, gad7=2, crisis=False, log=None):
    surveys = _surveys(phq9=phq9, gad7=gad7, crisis=crisis)
    ml = _ml_zero()
    forecast = _forecast()
    usage = _usage_empty()
    daily = log or {}

    return [
        patch("agent.orchestrator.get_survey_scores", return_value=surveys),
        patch("agent.orchestrator.get_ml_scores", return_value=ml),
        patch("agent.orchestrator.get_usage_summary", return_value=usage),
        patch("triage.tree.get_survey_scores", return_value=surveys),
        patch("triage.tree.get_ml_scores", return_value=ml),
        patch("triage.tree.get_usage_summary", return_value=usage),
        patch("triage.tree._safe_get_forecast", return_value=forecast),
        patch("triage.tree.get_cv_scores", return_value={"cv_available": False}),
        patch("triage.tree._get_daily_log", return_value={}),
        patch("agent.orchestrator.read_today_log", return_value=daily),
        patch("agent.orchestrator.client"),
    ]


def test_crisis_short_circuits_llm():
    patches = _patch_all(phq9=18, crisis=True)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], \
         patches[10] as mock_client:
        result = orch.chat(user_id="u1", message="hola")
    assert result["playbook_activated"] == "crisis-escalation"
    mock_client.chat.completions.create.assert_not_called()


def test_crisis_keyword_in_message_short_circuits():
    patches = _patch_all(phq9=3)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], \
         patches[10] as mock_client:
        result = orch.chat(user_id="u1", message="quiero suicidarme")
    assert result["playbook_activated"] == "crisis-escalation"
    mock_client.chat.completions.create.assert_not_called()


def test_morning_agent_selected_before_11am_no_checkin():
    patches = _patch_all()
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9], \
         patches[10] as mock_client:
        mock_client.chat.completions.create.return_value = _mock_llm_response("Buenos días!")
        with patch("agent.orchestrator._current_hour", return_value=9):
            result = orch.chat(user_id="u1", message="buenos días")
    call_args = mock_client.chat.completions.create.call_args
    system_msg = call_args[1]["messages"][0]["content"]
    assert "Morning Agent" in system_msg


def test_default_agent_used_when_no_specialist_matches():
    patches = _patch_all(log={"morning_mood": 4})
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], \
         patch("agent.orchestrator.read_today_log", return_value={"morning_mood": 4}), \
         patches[10] as mock_client:
        mock_client.chat.completions.create.return_value = _mock_llm_response("Hola!")
        with patch("agent.orchestrator._current_hour", return_value=15):
            result = orch.chat(user_id="u1", message="hola")
    call_args = mock_client.chat.completions.create.call_args
    system_msg = call_args[1]["messages"][0]["content"]
    assert "copiloto" in system_msg.lower()
