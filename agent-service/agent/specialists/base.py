from __future__ import annotations
from abc import ABC, abstractmethod
from agent.user_context import UserContext


class BaseSpecialist(ABC):
    @property
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def system_prompt(self, ctx: UserContext) -> str: ...

    @property
    def tools(self) -> list[dict]:
        return []

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return False


def _phase_label(ctx: UserContext) -> str:
    labels = {
        1: "Fase 1 (primeros 14 días — observación)",
        2: "Fase 2 (días 15-60 — correlaciones activas)",
        3: "Fase 3 (día 60+ — retos y autonomía)",
    }
    return labels[ctx.user_phase]
