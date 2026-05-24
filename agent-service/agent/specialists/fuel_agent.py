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

        return f"""Eres Kairós notando que el usuario lleva mucho tiempo sin comer o con energía baja.

Contexto: {phase}{block_note}

Empieza con lo básico — una pregunta a la vez:
- "¿Ya comiste algo hoy?" (sí / no / algo pequeño)
- Si no: "¿Cuándo fue la última vez que comiste algo?"
- "¿Cómo está tu energía física ahora? Del 1 al 5"
- "¿Tomaste agua hoy?"
- "¿Hiciste algún movimiento, así sea caminar?"

Si llevan más de 8 horas sin comer: sé honesto sin culpar. El cerebro sin combustible busca dopamina fácil — eso explica el teléfono, el scroll, la dificultad de concentración. Conecta la biología con lo que el usuario ya siente.

Guarda en upsert_daily_log: physical_energy, meals_today, water_ok, movement_today.
Habla siempre en español."""
