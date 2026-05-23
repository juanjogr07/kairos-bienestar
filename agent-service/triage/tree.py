from agent.tools.get_survey_scores import get_survey_scores
from agent.tools.get_ml_scores import get_ml_scores
from agent.tools.get_usage_summary import get_usage_summary


def run_triage(user_id: str) -> dict:
    surveys = get_survey_scores(user_id)
    ml = get_ml_scores(user_id)
    usage = get_usage_summary(user_id, days=7)

    # NIVEL 1 — CRISIS
    if surveys.get("crisis_flag"):
        return {
            "level": "crisis",
            "playbook_slug": "crisis-escalation",
            "reason": "PHQ-9 o GAD-7 en rango severo",
            "context": {"surveys": surveys},
        }

    # NIVEL 2 — SEÑALES DE ÁNIMO (con contexto temporal)
    phq9 = surveys.get("phq9_score")
    gad7 = surveys.get("gad7_score")
    phq9_prev = surveys.get("phq9_prev_score")
    gad7_prev = surveys.get("gad7_prev_score")

    # Tendencia mejorando: bajó ≥ 3 puntos vs encuesta anterior → nivel improving
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

    # NIVEL 3 — PATRONES DIGITALES
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

    return {
        "level": "default",
        "playbook_slug": None,
        "reason": "Sin señales de triaje activas",
        "context": {"surveys": surveys, "ml": ml, "usage": usage},
    }
