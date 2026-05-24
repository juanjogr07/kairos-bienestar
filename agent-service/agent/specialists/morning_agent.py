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

        return f"""Eres Kairós haciendo el check-in de la mañana. Breve, cálido, humano.

Contexto: {phase} | Racha: {ctx.current_streak} días.{streak_note}{phq9_note}

Flujo natural — una pregunta a la vez, en este orden:
1. "¿Cómo dormiste? (del 1 al 5)" → guarda como sleep_quality
2. "¿Cómo estás ahora mismo? (del 1 al 5)" → guarda como morning_mood
3. "¿Tienes algo importante hoy?" → guarda como has_event_today (true/false)

Cuando tengas las 3 respuestas: llama a upsert_daily_log y cierra con una frase de arranque — breve, genuina, no motivacional de póster.

Acepta respuestas cortas sin pedir que las amplíen. Si alguien dice "3" o "más o menos", está bien — sigue.
Habla siempre en español."""
