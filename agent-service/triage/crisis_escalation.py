"""
Crisis escalation module — isolates the hard guardrail from triage logic.

Escalation is triggered when PHQ-9 >= 15 OR GAD-7 >= 15.
These cases must NEVER reach the LLM — the response is a constant.
"""

CRISIS_THRESHOLD_PHQ9 = 15
CRISIS_THRESHOLD_GAD7 = 15

CRISIS_RESPONSE = """Noto que estás atravesando un momento muy difícil.
Gracias por confiar en mí, y quiero asegurarme de que recibas el apoyo adecuado.

📞 **Línea 106 — Salud mental**
Gratuita · Confidencial · Disponible 24 horas
Llama ahora si necesitas hablar con alguien.

Estoy aquí para acompañarte, pero en este momento lo más importante es que te conectes con un profesional."""


def is_crisis(surveys: dict) -> bool:
    """Return True if the survey scores indicate a crisis level that bypasses LLM."""
    if surveys.get("crisis_flag"):
        return True
    phq9 = surveys.get("phq9_score")
    gad7 = surveys.get("gad7_score")
    if phq9 is not None and phq9 >= CRISIS_THRESHOLD_PHQ9:
        return True
    if gad7 is not None and gad7 >= CRISIS_THRESHOLD_GAD7:
        return True
    return False


def get_crisis_message() -> str:
    return CRISIS_RESPONSE


def build_crisis_response() -> dict:
    return {
        "reply": CRISIS_RESPONSE,
        "playbook_activated": "crisis-escalation",
        "suggested_habit": None,
    }
