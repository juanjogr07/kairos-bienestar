"""Crisis detection and response — PHQ-9 ≥ 15 or GAD-7 ≥ 15 triggers Línea 106."""

CRISIS_THRESHOLD_PHQ9 = 15
CRISIS_THRESHOLD_GAD7 = 15

CRISIS_RESPONSE = """Noto que estás atravesando un momento muy difícil.
Gracias por confiar en mí, y quiero asegurarme de que recibas el apoyo adecuado.

📞 **Línea 106 — Salud mental**
Gratuita · Confidencial · Disponible 24 horas
Llama ahora si necesitas hablar con alguien.

Estoy aquí para acompañarte, pero en este momento lo más importante es que te conectes con un profesional."""


def is_crisis(surveys: dict) -> bool:
    if surveys.get("crisis_flag"):
        return True
    phq9 = surveys.get("phq9_score")
    gad7 = surveys.get("gad7_score")
    if phq9 is not None and phq9 >= CRISIS_THRESHOLD_PHQ9:
        return True
    if gad7 is not None and gad7 >= CRISIS_THRESHOLD_GAD7:
        return True
    return False


def build_crisis_response() -> dict:
    return {
        "reply": CRISIS_RESPONSE,
        "playbook_activated": "crisis-escalation",
        "suggested_habit": None,
    }
