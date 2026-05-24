"""
Playbook metadata registry — single source of truth for all playbook slugs.
Provides helpers to select the active playbook and build RAG queries.
"""
from typing import Optional

PLAYBOOK_METADATA: dict[str, dict] = {
    "attention-fragmentation": {
        "signal_type": "digital",
        "activates_when": "attention_fragmentation_score > 0.60",
        "rag_query_template": "fragmentación atención cambios de pestaña concentración digital",
    },
    "nocturnal-use-pattern": {
        "signal_type": "digital",
        "activates_when": "nocturnal_pattern_score > 0.65",
        "rag_query_template": "uso nocturno teléfono sueño horario noche",
    },
    "doomscrolling": {
        "signal_type": "digital",
        "activates_when": "doomscrolling_score > 0.70",
        "rag_query_template": "doomscrolling scroll redes sociales consumo pasivo",
    },
    "low-mood-indicators": {
        "signal_type": "mood",
        "activates_when": "phq9_score >= 5 AND phq9_score < 15",
        "rag_query_template": "indicadores ánimo bajo depresión PHQ-9 bienestar emocional",
    },
    "anxiety-indicators": {
        "signal_type": "anxiety",
        "activates_when": "gad7_score >= 5 AND gad7_score < 15",
        "rag_query_template": "ansiedad GAD-7 regulación nerviosa respiración técnicas calma",
    },
    "momentum-builder": {
        "signal_type": "improving_trend",
        "activates_when": "phq9_prev - phq9 >= 3 OR gad7_prev - gad7 >= 3",
        "rag_query_template": "tendencia mejora progreso motivación refuerzo positivo hábitos",
    },
    "habit-relapse-risk": {
        "signal_type": "relapse",
        "activates_when": "relapse_risk_score > 0.5",
        "rag_query_template": "riesgo recaída hábitos prevencion mantenimiento cambio comportamiento",
    },
    "crisis-escalation": {
        "signal_type": "crisis",
        "activates_when": "phq9_score >= 15 OR gad7_score >= 15 OR crisis_flag",
        "rag_query_template": "crisis salud mental apoyo profesional línea emergencias",
    },
    "focus-session-intro": {
        "signal_type": "onboarding",
        "activates_when": "focus_sessions_count == 0",
        "rag_query_template": "sesión enfoque productividad Pomodoro concentración sin interrupciones",
    },
}


def get_active_playbook(triage_result: dict) -> Optional[str]:
    """Return the playbook slug from a triage result, if any."""
    return triage_result.get("playbook_slug")


def build_rag_query(playbook_slug: str, user_context: dict | None = None) -> str:
    """Build a semantic search query for a given playbook slug."""
    meta = PLAYBOOK_METADATA.get(playbook_slug)
    if meta is None:
        return playbook_slug.replace("-", " ")
    return meta["rag_query_template"]


def list_all_slugs() -> list[str]:
    return list(PLAYBOOK_METADATA.keys())
