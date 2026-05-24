from agent.tools.get_survey_scores import get_survey_scores
from agent.tools.get_ml_scores import get_ml_scores
from agent.tools.get_usage_summary import get_usage_summary
from agent.tools.get_cv_scores import get_cv_scores


def _safe_get_forecast(user_id: str) -> dict:
    """Call get_forecast with a neutral fallback on any error.

    Isolated so that tests that don't patch it don't break — the DB mock
    returns empty data and get_forecast returns its neutral dict.
    """
    try:
        from agent.tools.get_forecast import get_forecast
        return get_forecast(user_id)
    except Exception:
        return {"relapse_risk_score": 0.0, "trend_direction": "unknown", "has_forecast": False}


def run_triage(user_id: str) -> dict:
    surveys = get_survey_scores(user_id)
    ml = get_ml_scores(user_id)
    usage = get_usage_summary(user_id, days=7)

    # ── NIVEL 1 — CRISIS (hard guardrail, no LLM) ────────────────────────────
    if surveys.get("crisis_flag"):
        return {
            "level": "crisis",
            "playbook_slug": "crisis-escalation",
            "reason": "PHQ-9 o GAD-7 en rango severo",
            "context": {"surveys": surveys},
        }

    phq9 = surveys.get("phq9_score")
    gad7 = surveys.get("gad7_score")
    phq9_prev = surveys.get("phq9_prev_score")
    gad7_prev = surveys.get("gad7_prev_score")

    # ── NIVEL 2 — MEJORA DE ÁNIMO (tendencia positiva) ───────────────────────
    if phq9 is not None and phq9_prev is not None and 5 <= phq9 < 15:
        if phq9_prev - phq9 >= 3:
            return {
                "level": "improving",
                "playbook_slug": "momentum-builder",
                "reason": f"PHQ-9 bajó de {phq9_prev} a {phq9} (mejora de {phq9_prev - phq9} puntos)",
                "context": {"surveys": surveys, "usage": usage},
            }

    if gad7 is not None and gad7_prev is not None and 5 <= gad7 < 15:
        if gad7_prev - gad7 >= 3:
            return {
                "level": "improving",
                "playbook_slug": "momentum-builder",
                "reason": f"GAD-7 bajó de {gad7_prev} a {gad7} (mejora de {gad7_prev - gad7} puntos)",
                "context": {"surveys": surveys, "usage": usage},
            }

    # ── NIVEL 3 — SEÑALES DE ÁNIMO ACTIVAS ───────────────────────────────────
    if phq9 is not None and 5 <= phq9 < 15:
        return {
            "level": "mood",
            "playbook_slug": "low-mood-indicators",
            "reason": f"PHQ-9 = {phq9} ({surveys['phq9_interpretation']})",
            "context": {"surveys": surveys, "usage": usage},
        }

    if gad7 is not None and 5 <= gad7 < 15:
        return {
            "level": "mood",
            "playbook_slug": "low-mood-indicators",
            "reason": f"GAD-7 = {gad7} ({surveys['gad7_interpretation']})",
            "context": {"surveys": surveys, "usage": usage},
        }

    # ── NIVEL 4 — RIESGO DE RECAÍDA (Prophet forecast) ───────────────────────
    forecast = _safe_get_forecast(user_id)
    if forecast.get("relapse_risk_score", 0.0) > 0.5:
        return {
            "level": "relapse_risk",
            "playbook_slug": "habit-relapse-risk",
            "reason": f"Tendencia {forecast['trend_direction']} — relapse_risk = {forecast['relapse_risk_score']:.2f}",
            "context": {"forecast": forecast, "usage": usage},
        }

    # ── NIVEL 5 — PATRONES DIGITALES ─────────────────────────────────────────
    if ml.get("doomscrolling_score", 0) > 0.70:
        return {
            "level": "digital",
            "playbook_slug": "doomscrolling",
            "reason": f"doomscrolling_score = {ml['doomscrolling_score']:.2f}",
            "context": {"ml": ml, "usage": usage},
        }

    if ml.get("nocturnal_pattern_score", 0) > 0.65:
        return {
            "level": "digital",
            "playbook_slug": "nocturnal-use-pattern",
            "reason": f"nocturnal_pattern_score = {ml['nocturnal_pattern_score']:.2f}",
            "context": {"ml": ml, "usage": usage},
        }

    if ml.get("attention_fragmentation_score", 0) > 0.60:
        return {
            "level": "digital",
            "playbook_slug": "attention-fragmentation",
            "reason": f"attention_fragmentation_score = {ml['attention_fragmentation_score']:.2f}",
            "context": {"ml": ml, "usage": usage},
        }

    # ── NIVEL 6 — DÍA ATÍPICO (Isolation Forest) ─────────────────────────────
    if ml.get("anomaly_flag") and ml.get("anomaly_severity", 0) > 0.75:
        return {
            "level": "anomaly",
            "playbook_slug": "attention-fragmentation",
            "reason": f"Día atípico detectado — anomaly_score = {ml['anomaly_severity']:.2f}, features: {ml.get('flagged_features', [])}",
            "context": {"ml": ml, "usage": usage},
        }

    # ── NIVEL 7 — POSTURA & FATIGA VISUAL (Computer Vision) ──────────────────
    cv = get_cv_scores(user_id)
    if cv.get("cv_available"):
        if cv.get("eye_strain_score", 0) > 0.70:
            return {
                "level": "physical",
                "playbook_slug": "eye-strain-alert",
                "reason": f"Fatiga visual detectada — eye_strain = {cv['eye_strain_score']:.2f}, blink_rate = {cv['blink_rate_rpm']:.1f} rpm",
                "context": {"cv": cv, "usage": usage},
            }
        if cv.get("posture_score", 1) < 0.40:
            return {
                "level": "physical",
                "playbook_slug": "posture-correction",
                "reason": f"Mala postura detectada — posture_score = {cv['posture_score']:.2f}",
                "context": {"cv": cv, "usage": usage},
            }
        if cv.get("environment_context") == "bedroom" and cv.get("distraction_risk_score", 0) > 0.60:
            return {
                "level": "physical",
                "playbook_slug": "nocturnal-use-pattern",
                "reason": f"Uso digital en cama detectado — distraction_risk = {cv['distraction_risk_score']:.2f}",
                "context": {"cv": cv, "usage": usage},
            }

    return {
        "level": "default",
        "playbook_slug": None,
        "reason": "Sin señales de triaje activas",
        "context": {"surveys": surveys, "ml": ml, "usage": usage},
    }
