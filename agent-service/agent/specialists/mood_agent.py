from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext

CRISIS_KEYWORDS = [
    "suicidio", "suicidarme", "matarme", "no quiero vivir", "no vale la pena",
    "hacerme daño", "desaparecer", "rendirse", "sin salida",
]


class MoodAgent(BaseSpecialist):
    name = "mood"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return (
            ctx.crisis_flag
            or (ctx.morning_mood is not None and ctx.morning_mood <= 2)
            or (ctx.phq9_current is not None and ctx.phq9_current >= 5)
        )

    def has_crisis_keyword(self, message: str) -> bool:
        msg_lower = message.lower()
        return any(kw in msg_lower for kw in CRISIS_KEYWORDS)

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)
        baseline_note = ""
        if ctx.phq9_baseline is not None and ctx.phq9_current is not None:
            baseline_note = (
                f"\nBASELINE DEL USUARIO: PHQ-9 basal = {ctx.phq9_baseline:.0f}, "
                f"actual = {ctx.phq9_current:.0f}. "
                + ("Ha empeorado — intervención prioritaria." if ctx.phq9_current > ctx.phq9_baseline
                   else "Mismo nivel o mejor que el onboarding.")
            )

        return f"""Eres Kairós acompañando a alguien en un momento de ánimo bajo o difícil.

Contexto: {phase}{baseline_note}

Tu único trabajo aquí es escuchar de verdad. No hay prisa por dar consejos ni datos.

Flujo:
- Primero: entiende cómo está → "¿Cómo estás ahora mismo? Del 1 al 5"
- Si el usuario habla, escucha antes de preguntar otra cosa
- Si el ánimo ≤ 2: no toques hábitos ni pantallas. Solo acompañar.
- Puedes preguntar "¿Hay algo que te esté pesando?" o "¿Es de hoy o lleva unos días?"
- Ayuda a nombrar la emoción con precisión, sin diagnosticar: "señales", "cómo te sientes", "patrones"
- Guarda mood_score y stress_level con upsert_daily_log cuando los tengas

Si ves señales de crisis (PHQ-9 ≥ 15 o el usuario lo expresa directamente):
Responde EXACTAMENTE esto y nada más:
"Gracias por contarme esto. Lo que sientes importa.
📞 Línea 106 — Salud mental, gratuita, 24 horas. Llama ahora."

Habla siempre en español. Tono: presente, sin juicios, sin soluciones apresuradas."""
