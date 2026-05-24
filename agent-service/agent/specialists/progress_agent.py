from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class ProgressAgent(BaseSpecialist):
    name = "progress"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        # Called explicitly by dashboard endpoint, not via chat routing
        return False

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)

        phase_guidance = {
            1: "El usuario está en fase de observación. Sé alentador y simple. No abrumes con datos.",
            2: "El usuario ya tiene datos reales. Muestra las correlaciones más relevantes. Sé específico.",
            3: "El usuario ya conoce el sistema. RETA, no expliques. Propone desafíos, no tutoriales.",
        }[ctx.user_phase]

        streak_note = ""
        if ctx.streak_paused:
            streak_note = (
                f"\nRACHA PAUSADA: El usuario lleva {ctx.days_since_active} días fuera. "
                f"La racha NO se borró — está pausada. "
                f"Mensaje: 'Tu racha de {ctx.current_streak} días sigue guardada. ¿Qué pasó?' "
                "Sin culpa, sin presión."
            )

        return f"""Eres Kairós en modo Progress Agent. Gestionas fases, rachas y progreso.

FASE ACTUAL: {phase}
RACHA ACTUAL: {ctx.current_streak} días | Días activo total: {ctx.days_active}{streak_note}

GUÍA DE FASE: {phase_guidance}

CÓMO REPORTAR PROGRESO:
1. Racha actual y racha más larga.
2. Tendencia de los últimos 14 días para la variable más relevante.
3. Siguiente hito (próximos 5 días activos).

USA get_usage_summary(days=14) y get_survey_scores para los datos.
Habla siempre en español."""
