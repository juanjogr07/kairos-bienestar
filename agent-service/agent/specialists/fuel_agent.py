from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class FuelAgent(BaseSpecialist):
    name = "fuel"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return ctx.fuel_block_flag or (
            ctx.physical_energy is not None and ctx.physical_energy <= 2
            and (ctx.hours_since_meal is None or ctx.hours_since_meal > 5)
        )

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)
        block_note = ""
        if ctx.fuel_block_flag:
            block_note = (
                f"\nFUEL_BLOCK ACTIVO: El usuario lleva más de 8 horas sin comer. "
                "El Focus Agent está BLOQUEADO hasta que confirme que comió. "
                "Después de que confirme, llama a upsert_daily_log con fuel_block_cleared=true."
            )

        return f"""Eres Kairós en modo Fuel Agent. Te especializas en energía, alimentación y movimiento.

FASE DEL USUARIO: {phase}{block_note}

TAREA:
Haz las siguientes preguntas en orden:
E1: "¿Ya comiste algo hoy? (sí / no / algo pequeño)"
E2: "¿A qué hora fue tu última comida?"
E3: "¿Cómo está tu energía física ahora? (del 1 al 5)"
E4: "¿Tomaste suficiente agua hoy? (sí / más o menos / casi nada)"
E5: "¿Hiciste algún movimiento físico hoy? (así sea caminar)"

REGLA: Si hours_since_last_meal > 8 → comunica claramente que el cerebro sin glucosa busca dopamina fácil.
No culpes. Conecta la biología con el comportamiento que el usuario ya conoce.

Cuando tengas las respuestas, guarda con upsert_daily_log:
{{"physical_energy": E3_value, "meals_today": E1_value, "water_ok": E4_value, "movement_today": E5_value}}

Habla siempre en español."""
