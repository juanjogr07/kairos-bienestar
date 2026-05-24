from triage.crisis_escalation import (
    is_crisis,
    build_crisis_response,
    get_crisis_message,
    CRISIS_RESPONSE,
    CRISIS_THRESHOLD_PHQ9,
    CRISIS_THRESHOLD_GAD7,
)


def test_crisis_flag_triggers_crisis():
    assert is_crisis({"crisis_flag": True, "phq9_score": 5, "gad7_score": 5})


def test_phq9_at_threshold_triggers_crisis():
    assert is_crisis({"phq9_score": CRISIS_THRESHOLD_PHQ9, "gad7_score": 2})


def test_phq9_above_threshold_triggers_crisis():
    assert is_crisis({"phq9_score": 18, "gad7_score": 2})


def test_gad7_at_threshold_triggers_crisis():
    assert is_crisis({"phq9_score": 2, "gad7_score": CRISIS_THRESHOLD_GAD7})


def test_gad7_above_threshold_triggers_crisis():
    assert is_crisis({"phq9_score": 2, "gad7_score": 20})


def test_below_threshold_no_crisis():
    assert not is_crisis({"phq9_score": 14, "gad7_score": 14, "crisis_flag": False})


def test_none_scores_no_crisis():
    assert not is_crisis({"phq9_score": None, "gad7_score": None, "crisis_flag": False})


def test_empty_surveys_no_crisis():
    assert not is_crisis({})


def test_crisis_message_contains_linea_106():
    assert "106" in get_crisis_message()


def test_crisis_message_is_constant():
    assert get_crisis_message() == CRISIS_RESPONSE


def test_build_crisis_response_structure():
    r = build_crisis_response()
    assert r["reply"] == CRISIS_RESPONSE
    assert r["playbook_activated"] == "crisis-escalation"
    assert r["suggested_habit"] is None


def test_thresholds_are_15():
    assert CRISIS_THRESHOLD_PHQ9 == 15
    assert CRISIS_THRESHOLD_GAD7 == 15
