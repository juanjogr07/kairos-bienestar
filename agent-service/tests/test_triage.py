import triage.tree as triage_tree
from unittest.mock import patch


# ─── helpers ──────────────────────────────────────────────────────────────────

def _surveys(phq9=2, phq9_prev=None, gad7=2, gad7_prev=None, crisis=False):
    return {
        "phq9_score": phq9,
        "phq9_prev_score": phq9_prev,
        "phq9_interpretation": "mínimo",
        "gad7_score": gad7,
        "gad7_prev_score": gad7_prev,
        "gad7_interpretation": "mínimo",
        "crisis_flag": crisis,
    }

def _ml_zero():
    return {
        "attention_fragmentation_score": 0.3,
        "nocturnal_pattern_score": 0.4,
        "doomscrolling_score": 0.5,
        "anomaly_flag": False,
        "anomaly_severity": 0.0,
        "has_ml_data": False,
    }

def _usage_empty():
    return {"top_domains": [], "today_minutes": 0, "avg_daily_minutes": 0, "days_with_data": 0}

def _forecast(relapse_risk=0.0, trend="stable"):
    return {
        "relapse_risk_score": relapse_risk,
        "trend_direction": trend,
        "has_forecast": relapse_risk > 0,
    }

def _run(surveys, ml=None, usage=None, forecast=None):
    ml = ml or _ml_zero()
    usage = usage or _usage_empty()
    forecast = forecast or _forecast()
    with patch.object(triage_tree, "get_survey_scores", return_value=surveys), \
         patch.object(triage_tree, "get_ml_scores", return_value=ml), \
         patch.object(triage_tree, "get_usage_summary", return_value=usage), \
         patch.object(triage_tree, "_safe_get_forecast", return_value=forecast):
        return triage_tree.run_triage("user-1")


# ─── tests originales (regresión) ─────────────────────────────────────────────

def test_crisis_escalation():
    result = _run(_surveys(phq9=18, crisis=True))
    assert result["level"] == "crisis"
    assert result["playbook_slug"] == "crisis-escalation"


def test_doomscrolling_signal():
    ml = {**_ml_zero(), "doomscrolling_score": 0.85, "has_ml_data": True}
    usage = {"top_domains": [], "today_minutes": 120, "avg_daily_minutes": 90, "days_with_data": 7}
    result = _run(_surveys(phq9=3, gad7=3), ml=ml, usage=usage)
    assert result["level"] == "digital"
    assert result["playbook_slug"] == "doomscrolling"


def test_mood_signal_phq9():
    result = _run(_surveys(phq9=9, gad7=4))
    assert result["level"] == "mood"
    assert result["playbook_slug"] == "low-mood-indicators"


def test_default_no_signals():
    result = _run(_surveys(phq9=2, gad7=2))
    assert result["level"] == "default"
    assert result["playbook_slug"] is None


# ─── US-AI-001: tendencia mejorando (PHQ-9) ───────────────────────────────────

def test_improving_trend_phq9():
    """PHQ-9 bajó ≥ 3 puntos → nivel improving, no mood."""
    result = _run(_surveys(phq9=8, phq9_prev=12))
    assert result["level"] == "improving"
    assert result["playbook_slug"] == "momentum-builder"
    assert "bajó" in result["reason"]
    assert "12" in result["reason"] and "8" in result["reason"]


def test_improving_trend_gad7():
    """GAD-7 bajó ≥ 3 puntos → nivel improving."""
    result = _run(_surveys(gad7=6, gad7_prev=10))
    assert result["level"] == "improving"
    assert result["playbook_slug"] == "momentum-builder"


def test_improving_exact_threshold():
    """Bajada exacta de 3 puntos activa improving."""
    result = _run(_surveys(phq9=7, phq9_prev=10))
    assert result["level"] == "improving"


def test_improving_not_triggered_below_threshold():
    """Bajada de 2 puntos NO activa improving → sigue siendo mood."""
    result = _run(_surveys(phq9=8, phq9_prev=10))
    assert result["level"] == "mood"
    assert result["playbook_slug"] == "low-mood-indicators"


def test_improving_not_triggered_without_prev():
    """Sin score previo → no puede calcular tendencia → mood normal."""
    result = _run(_surveys(phq9=8, phq9_prev=None))
    assert result["level"] == "mood"


def test_improving_score_went_up():
    """Si el score subió, no es improving aunque la diferencia sea ≥ 3."""
    result = _run(_surveys(phq9=12, phq9_prev=8))
    assert result["level"] == "mood"  # subió → mood, no improving


# ─── US-AI-001: crisis ignora tendencia ───────────────────────────────────────

def test_crisis_ignores_trend():
    """PHQ-9 = 16 con tendencia bajista → sigue siendo crisis. Crisis es absoluta."""
    result = _run(_surveys(phq9=16, phq9_prev=20, crisis=True))
    assert result["level"] == "crisis"
    assert result["playbook_slug"] == "crisis-escalation"


def test_crisis_boundary_15_is_crisis():
    """PHQ-9 = 15 activa crisis_flag → crisis."""
    result = _run(_surveys(phq9=15, phq9_prev=18, crisis=True))
    assert result["level"] == "crisis"


def test_crisis_boundary_14_is_not_crisis():
    """PHQ-9 = 14 sin crisis_flag → mood (justo debajo del umbral)."""
    result = _run(_surveys(phq9=14, phq9_prev=14, crisis=False))
    assert result["level"] == "mood"


def test_crisis_boundary_14_improving():
    """PHQ-9 = 14 con bajada de 4 puntos → improving (no crisis)."""
    result = _run(_surveys(phq9=14, phq9_prev=18, crisis=False))
    assert result["level"] == "improving"


# ─── edge cases: valores límite y None ────────────────────────────────────────

def test_phq9_zero_is_default():
    """PHQ-9 = 0 → mínimo, no activa ningún nivel."""
    result = _run(_surveys(phq9=0, gad7=0))
    assert result["level"] == "default"


def test_phq9_none_no_crash():
    """Sin datos de encuesta → no rompe, retorna default."""
    result = _run(_surveys(phq9=None, gad7=None))
    assert result["level"] == "default"


def test_phq9_exactly_5_is_mood():
    """PHQ-9 = 5 es el mínimo para activar mood."""
    result = _run(_surveys(phq9=5))
    assert result["level"] == "mood"


def test_phq9_4_is_default():
    """PHQ-9 = 4 NO activa mood."""
    result = _run(_surveys(phq9=4))
    assert result["level"] == "default"


def test_both_improving_phq9_takes_priority():
    """Tanto PHQ-9 como GAD-7 bajaron ≥ 3 → PHQ-9 gana por orden."""
    result = _run(_surveys(phq9=7, phq9_prev=11, gad7=6, gad7_prev=10))
    assert result["level"] == "improving"
    assert "PHQ-9" in result["reason"]


def test_improving_not_triggered_when_score_below_5():
    """Si PHQ-9 = 4 (mínimo) no aplica improving aunque haya bajado."""
    result = _run(_surveys(phq9=4, phq9_prev=9))
    assert result["level"] == "default"


# ─── digital signals: no se rompen ────────────────────────────────────────────

def test_nocturnal_pattern_signal():
    ml = {**_ml_zero(), "nocturnal_pattern_score": 0.70, "has_ml_data": True}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "digital"
    assert result["playbook_slug"] == "nocturnal-use-pattern"


def test_attention_fragmentation_signal():
    ml = {**_ml_zero(), "attention_fragmentation_score": 0.65, "has_ml_data": True}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "digital"
    assert result["playbook_slug"] == "attention-fragmentation"


def test_digital_threshold_exact_doomscrolling():
    """doomscrolling_score exactamente 0.71 activa digital."""
    ml = {**_ml_zero(), "doomscrolling_score": 0.71, "has_ml_data": True}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "digital"


def test_digital_threshold_below_doomscrolling():
    """doomscrolling_score = 0.70 NO activa digital (umbral > 0.70)."""
    ml = {**_ml_zero(), "doomscrolling_score": 0.70, "has_ml_data": True}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "default"


# ─── prioridad: mood > digital ────────────────────────────────────────────────

def test_mood_takes_priority_over_digital():
    """PHQ-9 en rango mood + doomscrolling alto → mood gana."""
    ml = {**_ml_zero(), "doomscrolling_score": 0.90, "has_ml_data": True}
    result = _run(_surveys(phq9=9), ml=ml)
    assert result["level"] == "mood"


def test_improving_takes_priority_over_digital():
    """PHQ-9 mejorando + doomscrolling alto → improving gana."""
    ml = {**_ml_zero(), "doomscrolling_score": 0.90, "has_ml_data": True}
    result = _run(_surveys(phq9=7, phq9_prev=11), ml=ml)
    assert result["level"] == "improving"


# ─── NIVEL 4: relapse_risk (Prophet) ─────────────────────────────────────────

def test_relapse_risk_activates_above_threshold():
    """relapse_risk_score > 0.5 activa nivel relapse_risk."""
    result = _run(_surveys(), forecast=_forecast(relapse_risk=0.65, trend="increasing"))
    assert result["level"] == "relapse_risk"
    assert result["playbook_slug"] == "habit-relapse-risk"


def test_relapse_risk_not_activated_at_threshold():
    """relapse_risk_score = 0.5 NO activa (umbral > 0.5)."""
    result = _run(_surveys(), forecast=_forecast(relapse_risk=0.5, trend="increasing"))
    assert result["level"] == "default"


def test_relapse_risk_not_activated_below_threshold():
    """relapse_risk_score = 0.3 → default."""
    result = _run(_surveys(), forecast=_forecast(relapse_risk=0.3))
    assert result["level"] == "default"


def test_mood_takes_priority_over_relapse():
    """PHQ-9 en rango mood + relapse_risk alto → mood gana."""
    result = _run(_surveys(phq9=9), forecast=_forecast(relapse_risk=0.8))
    assert result["level"] == "mood"


def test_relapse_takes_priority_over_digital():
    """relapse_risk alto + doomscrolling alto → relapse_risk gana."""
    ml = {**_ml_zero(), "doomscrolling_score": 0.90}
    result = _run(_surveys(), ml=ml, forecast=_forecast(relapse_risk=0.7))
    assert result["level"] == "relapse_risk"


def test_relapse_reason_contains_trend():
    """La razón del triaje relapse_risk menciona la tendencia."""
    result = _run(_surveys(), forecast=_forecast(relapse_risk=0.72, trend="increasing"))
    assert "increasing" in result["reason"]
    assert "0.72" in result["reason"]


# ─── NIVEL 6: anomaly ────────────────────────────────────────────────────────

def test_anomaly_activates_when_flag_and_high_severity():
    """anomaly_flag=True + anomaly_severity > 0.75 → nivel anomaly."""
    ml = {**_ml_zero(), "anomaly_flag": True, "anomaly_severity": 0.85, "flagged_features": ["nocturnal_min"]}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "anomaly"


def test_anomaly_not_activated_without_flag():
    """anomaly_severity alto sin anomaly_flag → no activa anomaly."""
    ml = {**_ml_zero(), "anomaly_flag": False, "anomaly_severity": 0.90}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "default"


def test_anomaly_not_activated_below_severity_threshold():
    """anomaly_flag=True pero severity ≤ 0.75 → no activa anomaly."""
    ml = {**_ml_zero(), "anomaly_flag": True, "anomaly_severity": 0.75}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "default"


def test_digital_takes_priority_over_anomaly():
    """doomscrolling alto + anomaly → digital gana (digital se chequea primero)."""
    ml = {**_ml_zero(), "doomscrolling_score": 0.80, "anomaly_flag": True, "anomaly_severity": 0.90}
    result = _run(_surveys(), ml=ml)
    assert result["level"] == "digital"


def test_crisis_takes_priority_over_anomaly():
    """crisis siempre gana sobre anomaly."""
    ml = {**_ml_zero(), "anomaly_flag": True, "anomaly_severity": 0.95}
    result = _run(_surveys(crisis=True, phq9=18), ml=ml)
    assert result["level"] == "crisis"


# ─── P3: fuel_block ──────────────────────────────────────────────────────────

def test_p3_fuel_block_activates():
    """fuel_block_flag = True → nivel fuel_block, Focus bloqueado."""
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys()), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"hours_since_meal": 9.0}):
        result = tt.run_triage("u1")
    assert result["level"] == "fuel_block"
    assert result["playbook_slug"] == "fuel-block"


def test_p3_fuel_block_not_activated_under_threshold():
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys()), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"hours_since_meal": 7.0}):
        result = tt.run_triage("u1")
    assert result["level"] == "default"


# ─── P4: sleep_block ─────────────────────────────────────────────────────────

def test_p4_sleep_block_activates():
    """sleep_hours < 5 AND hour >= 21 → nivel sleep_block."""
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys()), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"sleep_hours": 4.0}), \
         patch.object(tt, "_current_hour", return_value=22):
        result = tt.run_triage("u1")
    assert result["level"] == "sleep_block"


def test_crisis_takes_priority_over_fuel_block():
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys(phq9=18, crisis=True)), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"hours_since_meal": 10.0}):
        result = tt.run_triage("u1")
    assert result["level"] == "crisis"
