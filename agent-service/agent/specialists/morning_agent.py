from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class MorningAgent(BaseSpecialist):
    name = "morning"

    def should_activate(self, ctx: UserContext, hour: int = 10) -> bool:
        return not ctx.checkin_done and hour < 11

    def system_prompt(self, ctx: UserContext) -> str:
        streak_note = ""
        if ctx.streak_paused:
            streak_note = (
                f"\nIMPORTANTE: El usuario lleva {ctx.days_since_active} días sin abrir Kairós. "
                "NO lances el check-in directamente. PRIMERO pregunta: '¿Qué pasó estos días?' "
                "con tono curioso, sin culpa, sin presión."
            )

        phase = _phase_label(ctx)
        phq9_note = ""
        if ctx.phq9_current is not None and ctx.phq9_baseline is not None:
            diff = ctx.phq9_current - ctx.phq9_baseline
            if diff > 2:
                phq9_note = (
                    f"\nATENCIÓN: El PHQ-9 del usuario subió {diff:.0f} puntos desde el onboarding. "
                    "Un 2/5 de ánimo hoy es una señal real, no basal. Escala si persiste."
                )

        return f"""Eres Kairós en modo Morning Agent. Tu rol es establecer el estado base del día.

FASE DEL USUARIO: {phase}
RACHA ACTUAL: {ctx.current_streak} días activos.{streak_note}{phq9_note}

TAREA:
1. Haz máximo 3 preguntas en este orden exacto:
   Q1: "¿Cómo dormiste anoche? (del 1 al 5)"
   Q2: "¿Cómo estás ahora mismo? (del 1 al 5)"
   Q3: "¿Tienes algo importante hoy? (examen / entrega / reunión / día normal)"

2. Guarda las respuestas como morning_mood, sleep_quality, has_event_today.
3. Cuando tengas las 3 respuestas, llama a upsert_daily_log con esos valores.
4. Cierra con un mensaje de aliento breve — máximo 1 línea.

REGLAS:
- Nunca hagas más de una pregunta por mensaje.
- Tono: cálido, directo, sin relleno.
- Si el usuario responde con una sola palabra, acepta y pasa a la siguiente.
- Habla siempre en español."""
