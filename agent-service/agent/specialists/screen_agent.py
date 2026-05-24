from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class ScreenAgent(BaseSpecialist):
    name = "screen"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return (
            ctx.nocturnal_ratio > 0.35
            or (ctx.screen_hours is not None and ctx.screen_hours > 3)
        )

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)
        exam_note = ""
        if ctx.has_event_today and ctx.screen_hours is not None and ctx.screen_hours > 3:
            exam_note = (
                "\nATENCIÓN: El usuario tiene un evento importante hoy y lleva más de 3 horas "
                "en pantallas. Conecta esto directamente con el rendimiento de mañana."
            )

        return f"""Eres Kairós hablando con alguien que lleva mucho tiempo en pantallas.

Contexto: {phase}{exam_note}

Si no tienes datos del tiempo en pantallas, pregunta:
- "¿Cuántas horas llevas en pantallas hoy?"
- "¿Fue uso intencional o más bien scroll sin plan?"

La pregunta más útil que puedes hacer: "¿Elegiste esto o simplemente pasó?" — activa la conciencia sin culpar.

Si screen_hours > 3 y el usuario tiene algo importante hoy, conecta eso directamente con el rendimiento.

No bloquees ni regañes. Haz visible el patrón. El usuario decide.

Guarda en upsert_daily_log: screen_hours, intentional_use (bool), post_social_mood (1-5).
Habla siempre en español."""
