import triage.tree as triage_tree  # force import so patch.object can find targets
from unittest.mock import patch


def _mock_surveys_crisis():
    return {"phq9_score": 18, "phq9_interpretation": "severo", "gad7_score": 8, "gad7_interpretation": "leve", "crisis_flag": True}

def _mock_ml_zero():
    return {"attention_fragmentation_score": 0.3, "nocturnal_pattern_score": 0.4, "doomscrolling_score": 0.5, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": False}

def _mock_usage_empty():
    return {"top_domains": [], "today_minutes": 0, "avg_daily_minutes": 0, "days_with_data": 0}


def test_crisis_escalation():
    with patch.object(triage_tree, "get_survey_scores", return_value=_mock_surveys_crisis()), \
         patch.object(triage_tree, "get_ml_scores", return_value=_mock_ml_zero()), \
         patch.object(triage_tree, "get_usage_summary", return_value=_mock_usage_empty()):
        result = triage_tree.run_triage("user-1")

    assert result["level"] == "crisis"
    assert result["playbook_slug"] == "crisis-escalation"


def test_doomscrolling_signal():
    surveys = {"phq9_score": 3, "phq9_interpretation": "mínimo", "gad7_score": 3, "gad7_interpretation": "mínimo", "crisis_flag": False}
    ml = {"attention_fragmentation_score": 0.3, "nocturnal_pattern_score": 0.4, "doomscrolling_score": 0.85, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": True}
    usage = {"top_domains": [], "today_minutes": 120, "avg_daily_minutes": 90, "days_with_data": 7}

    with patch.object(triage_tree, "get_survey_scores", return_value=surveys), \
         patch.object(triage_tree, "get_ml_scores", return_value=ml), \
         patch.object(triage_tree, "get_usage_summary", return_value=usage):
        result = triage_tree.run_triage("user-1")

    assert result["level"] == "digital"
    assert result["playbook_slug"] == "doomscrolling"


def test_mood_signal_phq9():
    surveys = {"phq9_score": 9, "phq9_interpretation": "leve", "gad7_score": 4, "gad7_interpretation": "mínimo", "crisis_flag": False}
    ml = {"attention_fragmentation_score": 0.2, "nocturnal_pattern_score": 0.3, "doomscrolling_score": 0.4, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": False}
    usage = {"top_domains": [], "today_minutes": 60, "avg_daily_minutes": 50, "days_with_data": 5}

    with patch.object(triage_tree, "get_survey_scores", return_value=surveys), \
         patch.object(triage_tree, "get_ml_scores", return_value=ml), \
         patch.object(triage_tree, "get_usage_summary", return_value=usage):
        result = triage_tree.run_triage("user-1")

    assert result["level"] == "mood"
    assert result["playbook_slug"] == "low-mood-indicators"


def test_default_no_signals():
    surveys = {"phq9_score": 2, "phq9_interpretation": "mínimo", "gad7_score": 2, "gad7_interpretation": "mínimo", "crisis_flag": False}
    ml = {"attention_fragmentation_score": 0.2, "nocturnal_pattern_score": 0.3, "doomscrolling_score": 0.4, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": False}
    usage = {"top_domains": [], "today_minutes": 30, "avg_daily_minutes": 25, "days_with_data": 3}

    with patch.object(triage_tree, "get_survey_scores", return_value=surveys), \
         patch.object(triage_tree, "get_ml_scores", return_value=ml), \
         patch.object(triage_tree, "get_usage_summary", return_value=usage):
        result = triage_tree.run_triage("user-1")

    assert result["level"] == "default"
    assert result["playbook_slug"] is None
