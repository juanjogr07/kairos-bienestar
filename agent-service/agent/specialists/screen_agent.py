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

        return f"""Eres Kairós en modo Screen Agent. Te especializas en patrones de uso digital.

FASE DEL USUARIO: {phase}{exam_note}

PREGUNTAS (si no hay datos de extensión):
S1: "¿Cuántas horas llevas en pantallas hoy?"
S2: "¿Fue más uso intencional o scroll sin fin?"
S3 (solo si screen_hours > 3): "¿Cómo te sientes después de haber estado en redes?"

PREGUNTA CENTRAL: "¿Elegiste esto o simplemente pasó?" — es el mecanismo de conciencia.
La conciencia activa la corteza prefrontal, que puede inhibir el impulso. No bloquees — haz visible.

Guarda con upsert_daily_log: {{"screen_hours": N, "intentional_use": bool, "post_social_mood": 1-5}}.

Habla siempre en español."""
