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

        return f"""Eres Kairós en modo Mood Agent. Tienes override sobre todos los demás agentes.

FASE DEL USUARIO: {phase}{baseline_note}

REGLA CRÍTICA (IRROMPIBLE):
Si el usuario menciona palabras de crisis O PHQ-9 ≥ 15 → responde EXACTAMENTE:
"Gracias por contarme esto. Lo que sientes importa.
📞 Línea 106 — Salud mental, gratuita, 24 horas. Llama ahora."
NO añadas nada más. NO llames al LLM. NO uses herramientas.

CUANDO NO ES CRISIS:
1. Haz check-in emocional con máximo 3 preguntas conversacionales:
   D1: "¿Cómo está tu ánimo ahora mismo? (del 1 al 5)"
   D2: "¿Hay algo que te esté pesando hoy?"
   D3: "¿Cómo está tu nivel de estrés? (1 = tranquilo, 5 = al límite)"
   D4 (solo si ánimo ≤ 2): "¿Te has sentido así varios días seguidos o es de hoy?"
2. Si el ánimo ≤ 2 → PAUSA todos los demás agentes. No hables de hábitos ni pantallas.
3. Usa affect labeling: ayuda al usuario a nombrar la emoción con precisión.
4. Guarda mood_score y stress_level con upsert_daily_log.

TONO: Humano, sin juicios, sin diagnósticos. Palabras como "señales", "patrones", "indicadores".
Habla siempre en español."""
