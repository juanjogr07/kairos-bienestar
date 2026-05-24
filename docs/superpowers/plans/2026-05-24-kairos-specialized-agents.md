# Kairós — Specialized Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 specialized agent modules to the existing Kairós orchestrator so each conversation is handled by the agent with the right domain expertise (Morning, Mood, Sleep, Focus, Screen, Fuel, Insight, Progress).

**Architecture:** The existing `orchestrator.py` already handles triage → LLM routing. We extend it by: (1) building a `UserContext` dataclass at the start of every call, (2) adding a `BaseSpecialist` abstraction where each agent owns its system prompt + tool list, (3) updating the orchestrator to select the right specialist. The `daily_features` table already exists — we use its `features jsonb` column as the DailyLog store.

**Tech Stack:** Python 3.11, FastAPI, Supabase (existing `daily_features` + `streaks` tables), OpenRouter (existing), pytest + unittest.mock (existing conftest pattern).

**Critical path (MVP demo):** Tasks 1 → 2 → 3 → 4 → 9 → 10. Tasks 5-8 complete the spec.

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `agent-service/agent/user_context.py` | UserContext dataclass + `build_user_context()` |
| Create | `agent-service/agent/daily_log.py` | DailyLog upsert/read on `daily_features` |
| Create | `agent-service/agent/specialists/__init__.py` | Empty package marker |
| Create | `agent-service/agent/specialists/base.py` | BaseSpecialist abstract class |
| Create | `agent-service/agent/specialists/morning_agent.py` | Morning check-in specialist |
| Create | `agent-service/agent/specialists/mood_agent.py` | Mood + crisis override specialist |
| Create | `agent-service/agent/specialists/sleep_agent.py` | Sleep tracking specialist |
| Create | `agent-service/agent/specialists/focus_agent.py` | Focus session specialist |
| Create | `agent-service/agent/specialists/screen_agent.py` | Screen time specialist |
| Create | `agent-service/agent/specialists/fuel_agent.py` | Energy / nutrition specialist |
| Create | `agent-service/agent/specialists/insight_agent.py` | Weekly auto-insight specialist |
| Create | `agent-service/agent/specialists/progress_agent.py` | Phase + streak specialist |
| Modify | `agent-service/agent/orchestrator.py` | Route to specialists, inject UserContext |
| Modify | `agent-service/triage/tree.py` | Add P3 (fuel_block) + P4 (sleep_block) rules |
| Create | `agent-service/tests/test_user_context.py` | Unit tests for context builder + flags |
| Create | `agent-service/tests/test_daily_log.py` | Unit tests for DailyLog upsert/read |
| Create | `agent-service/tests/test_specialists.py` | Unit tests for specialist selection + prompts |

---

## Task 1 — UserContext dataclass + builder ⭐ CRÍTICO

**Files:**
- Create: `agent-service/agent/user_context.py`
- Create: `agent-service/tests/test_user_context.py`

- [ ] **Step 1: Write failing tests**

```python
# agent-service/tests/test_user_context.py
import sys
from unittest.mock import patch, MagicMock
from datetime import date

# conftest already stubs database, supabase, config — these tests just run

def _make_daily_features(features: dict):
    row = MagicMock()
    row.data = [{"features": features, "date": str(date.today())}]
    return row


def test_user_context_defaults():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1")
    assert ctx.user_phase == 1
    assert ctx.fuel_block_flag is False
    assert ctx.sleep_block_flag is False
    assert ctx.crisis_flag is False
    assert ctx.days_active == 0


def test_phase_calculation():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_active=5)
    assert ctx.user_phase == 1
    ctx2 = UserContext(user_id="u1", days_active=20)
    assert ctx2.user_phase == 2
    ctx3 = UserContext(user_id="u1", days_active=65)
    assert ctx3.user_phase == 3


def test_fuel_block_flag_computed():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", hours_since_meal=9.0)
    assert ctx.fuel_block_flag is True
    ctx2 = UserContext(user_id="u1", hours_since_meal=7.5)
    assert ctx2.fuel_block_flag is False


def test_sleep_block_flag_computed():
    from agent.user_context import UserContext
    # sleep_hours < 5 AND evening_flag already passed in
    ctx = UserContext(user_id="u1", sleep_hours=4.0, is_evening=True)
    assert ctx.sleep_block_flag is True
    ctx2 = UserContext(user_id="u1", sleep_hours=4.0, is_evening=False)
    assert ctx2.sleep_block_flag is False


def test_crisis_flag_from_surveys():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", phq9_current=16.0)
    assert ctx.crisis_flag is True
    ctx2 = UserContext(user_id="u1", phq9_current=14.0)
    assert ctx2.crisis_flag is False


def test_pause_streak_when_absent_3_days():
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_since_active=3, current_streak=7)
    assert ctx.streak_paused is True
    ctx2 = UserContext(user_id="u1", days_since_active=2, current_streak=7)
    assert ctx2.streak_paused is False
```

- [ ] **Step 2: Run to confirm they fail**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_user_context.py -v 2>&1 | head -30
```
Expected: `ModuleNotFoundError: No module named 'agent.user_context'`

- [ ] **Step 3: Create the module**

```python
# agent-service/agent/user_context.py
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone


@dataclass
class UserContext:
    user_id: str
    # Survey scores
    phq9_baseline: Optional[float] = None
    gad7_baseline: Optional[float] = None
    phq9_current: Optional[float] = None
    gad7_current: Optional[float] = None
    # Today's check-in (from daily_features)
    morning_mood: Optional[int] = None      # 1-5
    sleep_quality: Optional[int] = None    # 1-5
    wake_time: Optional[str] = None
    has_event_today: bool = False
    sleep_hours: Optional[float] = None
    screen_hours: Optional[float] = None
    physical_energy: Optional[int] = None  # 1-5
    hours_since_meal: Optional[float] = None
    checkin_done: bool = False
    nocturnal_ratio: float = 0.0
    # Phase / streak
    days_active: int = 0
    days_since_active: int = 0
    current_streak: int = 0
    # Runtime flag: True if current local hour >= 21
    is_evening: bool = False

    # ── computed properties ──────────────────────────────────────────────────

    @property
    def user_phase(self) -> int:
        if self.days_active >= 60:
            return 3
        if self.days_active >= 15:
            return 2
        return 1

    @property
    def crisis_flag(self) -> bool:
        return (
            (self.phq9_current is not None and self.phq9_current >= 15)
            or (self.gad7_current is not None and self.gad7_current >= 15)
        )

    @property
    def fuel_block_flag(self) -> bool:
        return self.hours_since_meal is not None and self.hours_since_meal > 8

    @property
    def sleep_block_flag(self) -> bool:
        return (
            self.sleep_hours is not None
            and self.sleep_hours < 5
            and self.is_evening
        )

    @property
    def streak_paused(self) -> bool:
        return self.days_since_active >= 3
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_user_context.py -v
```
Expected: `7 passed`

- [ ] **Step 5: Commit**

```bash
git add agent-service/agent/user_context.py agent-service/tests/test_user_context.py
git commit -m "feat(agent): add UserContext dataclass with computed flags (phase, crisis, fuel_block, sleep_block)"
```

---

## Task 2 — DailyLog upsert / read ⭐ CRÍTICO

**Files:**
- Create: `agent-service/agent/daily_log.py`
- Create: `agent-service/tests/test_daily_log.py`

- [ ] **Step 1: Write failing tests**

```python
# agent-service/tests/test_daily_log.py
from unittest.mock import patch, MagicMock
from datetime import date


def _mock_supa_upsert():
    m = MagicMock()
    m.table.return_value.upsert.return_value.execute.return_value.data = [{"id": 1}]
    m.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value.data = []
    return m


def test_upsert_daily_log_calls_supabase():
    from agent import daily_log as dl
    mock_supa = _mock_supa_upsert()
    with patch.object(dl, "supabase", mock_supa):
        dl.upsert_daily_log("u1", {"morning_mood": 4, "sleep_quality": 3})
    mock_supa.table.assert_called_with("daily_features")
    call_args = mock_supa.table.return_value.upsert.call_args[0][0]
    assert call_args["user_id"] == "u1"
    assert call_args["features"]["morning_mood"] == 4
    assert call_args["date"] == str(date.today())


def test_read_daily_log_returns_empty_when_no_row():
    from agent import daily_log as dl
    mock_supa = _mock_supa_upsert()
    with patch.object(dl, "supabase", mock_supa):
        result = dl.read_today_log("u1")
    assert result == {}


def test_read_daily_log_returns_features():
    from agent import daily_log as dl
    mock_supa = _mock_supa_upsert()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value.data = [
        {"features": {"morning_mood": 3, "sleep_hours": 6.5}, "date": str(date.today())}
    ]
    with patch.object(dl, "supabase", mock_supa):
        result = dl.read_today_log("u1")
    assert result["morning_mood"] == 3
    assert result["sleep_hours"] == 6.5


def test_upsert_merges_existing_features():
    """upsert_daily_log should merge with existing features, not overwrite."""
    from agent import daily_log as dl
    existing = {"morning_mood": 4, "sleep_quality": 3}
    mock_supa = _mock_supa_upsert()
    mock_supa.table.return_value.select.return_value.eq.return_value.eq.return_value \
        .order.return_value.limit.return_value.execute.return_value.data = [
        {"features": existing, "date": str(date.today())}
    ]
    with patch.object(dl, "supabase", mock_supa):
        dl.upsert_daily_log("u1", {"screen_hours": 3.5})
    upserted = mock_supa.table.return_value.upsert.call_args[0][0]
    assert upserted["features"]["morning_mood"] == 4    # preserved
    assert upserted["features"]["screen_hours"] == 3.5  # added
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_daily_log.py -v 2>&1 | head -20
```
Expected: `ModuleNotFoundError: No module named 'agent.daily_log'`

- [ ] **Step 3: Implement**

```python
# agent-service/agent/daily_log.py
from datetime import date
from database import supabase


def read_today_log(user_id: str) -> dict:
    """Read today's daily_features row for user. Returns {} if none."""
    res = (
        supabase.table("daily_features")
        .select("features")
        .eq("user_id", user_id)
        .eq("date", str(date.today()))
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return {}
    return res.data[0].get("features") or {}


def upsert_daily_log(user_id: str, updates: dict) -> None:
    """Merge `updates` into today's daily_features row (upsert on user_id+date)."""
    existing = read_today_log(user_id)
    merged = {**existing, **updates}
    supabase.table("daily_features").upsert(
        {
            "user_id": user_id,
            "date": str(date.today()),
            "features": merged,
        },
        on_conflict="user_id,date",
    ).execute()
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_daily_log.py -v
```
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add agent-service/agent/daily_log.py agent-service/tests/test_daily_log.py
git commit -m "feat(agent): add DailyLog upsert/read on daily_features table"
```

---

## Task 3 — BaseSpecialist + orchestrator routing ⭐ CRÍTICO

**Files:**
- Create: `agent-service/agent/specialists/__init__.py`
- Create: `agent-service/agent/specialists/base.py`
- Create: `agent-service/tests/test_specialists.py`
- Modify: `agent-service/agent/orchestrator.py`

- [ ] **Step 1: Write failing tests**

```python
# agent-service/tests/test_specialists.py
from agent.user_context import UserContext


def _ctx(**kwargs):
    return UserContext(user_id="u1", **kwargs)


def test_base_specialist_interface():
    from agent.specialists.base import BaseSpecialist
    # Can't instantiate abstract class
    import pytest
    with pytest.raises(TypeError):
        BaseSpecialist()


def test_morning_agent_activates_before_11am_no_checkin():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(checkin_done=False)
    agent = MorningAgent()
    assert agent.should_activate(ctx, hour=9) is True


def test_morning_agent_does_not_activate_after_checkin():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(checkin_done=True)
    agent = MorningAgent()
    assert agent.should_activate(ctx, hour=9) is False


def test_morning_agent_does_not_activate_after_11am():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(checkin_done=False)
    agent = MorningAgent()
    assert agent.should_activate(ctx, hour=12) is False


def test_mood_agent_activates_on_crisis():
    from agent.specialists.mood_agent import MoodAgent
    ctx = _ctx(phq9_current=16.0)
    agent = MoodAgent()
    assert agent.should_activate(ctx) is True


def test_mood_agent_activates_on_low_morning_mood():
    from agent.specialists.mood_agent import MoodAgent
    ctx = _ctx(morning_mood=2)
    agent = MoodAgent()
    assert agent.should_activate(ctx) is True


def test_fuel_agent_activates_on_block_flag():
    from agent.specialists.fuel_agent import FuelAgent
    ctx = _ctx(hours_since_meal=9.0)
    agent = FuelAgent()
    assert agent.should_activate(ctx) is True


def test_sleep_agent_activates_on_sleep_block():
    from agent.specialists.sleep_agent import SleepAgent
    ctx = _ctx(sleep_hours=4.0, is_evening=True)
    agent = SleepAgent()
    assert agent.should_activate(ctx) is True


def test_specialist_system_prompt_contains_phase():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(days_active=20)
    agent = MorningAgent()
    prompt = agent.system_prompt(ctx)
    assert "Fase 2" in prompt or "fase 2" in prompt.lower()


def test_morning_agent_streak_paused_message():
    from agent.specialists.morning_agent import MorningAgent
    ctx = _ctx(days_since_active=4, current_streak=5)
    agent = MorningAgent()
    prompt = agent.system_prompt(ctx)
    assert "pasó" in prompt or "qué pasó" in prompt.lower()
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_specialists.py -v 2>&1 | head -30
```
Expected: multiple `ModuleNotFoundError`

- [ ] **Step 3: Create package + BaseSpecialist**

```python
# agent-service/agent/specialists/__init__.py
```

```python
# agent-service/agent/specialists/base.py
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
        """Default: empty tool list. Override to add domain tools."""
        return []

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return False


def _phase_label(ctx: UserContext) -> str:
    labels = {1: "Fase 1 (primeros 14 días — observación)",
               2: "Fase 2 (días 15-60 — correlaciones activas)",
               3: "Fase 3 (día 60+ — retos y autonomía)"}
    return labels[ctx.user_phase]
```

- [ ] **Step 4: Create MorningAgent**

```python
# agent-service/agent/specialists/morning_agent.py
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
```

- [ ] **Step 5: Create MoodAgent**

```python
# agent-service/agent/specialists/mood_agent.py
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
```

- [ ] **Step 6: Create FuelAgent**

```python
# agent-service/agent/specialists/fuel_agent.py
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
```

- [ ] **Step 7: Create SleepAgent**

```python
# agent-service/agent/specialists/sleep_agent.py
from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class SleepAgent(BaseSpecialist):
    name = "sleep"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return ctx.sleep_block_flag or ctx.nocturnal_ratio > 0.40

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)
        block_note = ""
        if ctx.sleep_block_flag:
            block_note = (
                "\nSLEEP_BLOCK ACTIVO: El usuario ha dormido menos de 5 horas y quiere estudiar. "
                "Sé honesto: 'Con este estado de sueño no va a entrar nada nuevo. "
                "El cerebro sin sueño no puede consolidar memoria.' "
                "NO fuerces la sesión de foco. Ofrece la alternativa más corta posible."
            )

        return f"""Eres Kairós en modo Sleep Agent. Te especializas en ciclos de sueño y rutina circadiana.

FASE DEL USUARIO: {phase}{block_note}

PREGUNTAS (mañana):
M1: "¿Cuántas horas dormiste aproximadamente?"
M2: "¿Cuánto tardaste en quedarte dormido? (poco / bastante / mucho)"
M3: "¿A qué hora miraste el teléfono por última vez antes de dormir?"

PREGUNTAS (noche, después de las 22:00):
N1: "¿A qué hora piensas acostarte hoy?"
N2: "¿Cómo estuvo tu energía durante el día? (del 1 al 5)"

REGLA: Sugiere UN solo cambio a la vez. Nunca listas. Un cambio tiene 3x más probabilidad de mantenerse.
Guarda con upsert_daily_log: sleep_hours, bedtime_intent, last_screen_before_sleep.

Habla siempre en español."""
```

- [ ] **Step 8: Create FocusAgent**

```python
# agent-service/agent/specialists/focus_agent.py
from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class FocusAgent(BaseSpecialist):
    name = "focus"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return ctx.has_event_today and not ctx.sleep_block_flag and not ctx.fuel_block_flag

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)
        return f"""Eres Kairós en modo Focus Agent. Te especializas en sesiones de estudio y atención sostenida.

FASE DEL USUARIO: {phase}

PREGUNTAS (siempre en este orden):
F1: "¿Cuánto tiempo tienes disponible ahora mismo, sin interrupciones?" ← SIEMPRE primera
F2: "¿Qué necesitas estudiar o hacer?"
F3: "¿Cómo te sientes para arrancar? (listo / un poco bloqueado / no puedo)"
F4: "¿Tienes el teléfono cerca o en otro cuarto?"
F5 (al terminar): "¿Qué es lo único que vas a recordar de lo que hiciste?" ← guarda en DB

REGLA: Si F3 = "no puedo" Y el tono del mensaje es ansioso → deriva al Mood Agent.
NUNCA fuerces una sesión cuando el sistema nervioso está en modo supervivencia.

SESIONES: Empieza con 8-12 minutos. El cerebro re-aprende a sostener atención gradualmente.
Guarda con upsert_daily_log: {{"focus_sessions": N, "focus_recall": "texto del F5", "block_type": "anxiety|fatigue|distraction|none"}}.

Habla siempre en español."""
```

- [ ] **Step 9: Create ScreenAgent**

```python
# agent-service/agent/specialists/screen_agent.py
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
            exam_note = "\nATENCIÓN: El usuario tiene un evento importante hoy y lleva más de 3 horas en pantallas. Conecta esto directamente con el rendimiento de mañana."

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
```

- [ ] **Step 10: Run specialist tests — expect PASS**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_specialists.py -v
```
Expected: `10 passed`

- [ ] **Step 11: Update orchestrator to use specialists**

Edit `agent-service/agent/orchestrator.py`. Replace the `chat` function signature area (lines 177-195) with:

```python
# At the top of orchestrator.py, add these imports after existing imports:
from datetime import datetime, timezone
from agent.user_context import UserContext
from agent.daily_log import read_today_log, upsert_daily_log
from agent.specialists.morning_agent import MorningAgent
from agent.specialists.mood_agent import MoodAgent
from agent.specialists.sleep_agent import SleepAgent
from agent.specialists.focus_agent import FocusAgent
from agent.specialists.screen_agent import ScreenAgent
from agent.specialists.fuel_agent import FuelAgent

_SPECIALISTS = [MoodAgent(), FuelAgent(), SleepAgent(), FocusAgent(), ScreenAgent(), MorningAgent()]


def _build_user_context(user_id: str) -> UserContext:
    """Assemble UserContext from Supabase in one pass."""
    surveys = get_survey_scores(user_id)
    log = read_today_log(user_id)
    hour = datetime.now(timezone.utc).hour  # UTC; adjust if needed

    # Days active / streak from habits table (best effort)
    days_active = 0
    days_since_active = 0
    current_streak = 0
    try:
        from database import supabase
        res = (supabase.table("streaks")
               .select("current_streak,longest_streak,last_completion")
               .eq("user_id", user_id)
               .limit(1).execute())
        if res.data:
            row = res.data[0]
            current_streak = row.get("current_streak", 0)
            from datetime import date
            last = row.get("last_completion")
            if last:
                days_since_active = (date.today() - date.fromisoformat(last)).days
                days_active = current_streak + days_since_active
    except Exception:
        pass

    return UserContext(
        user_id=user_id,
        phq9_baseline=surveys.get("phq9_prev_score"),
        gad7_baseline=surveys.get("gad7_prev_score"),
        phq9_current=surveys.get("phq9_score"),
        gad7_current=surveys.get("gad7_score"),
        morning_mood=log.get("morning_mood"),
        sleep_quality=log.get("sleep_quality"),
        has_event_today=bool(log.get("has_event_today", False)),
        sleep_hours=log.get("sleep_hours"),
        screen_hours=log.get("screen_hours"),
        physical_energy=log.get("physical_energy"),
        hours_since_meal=log.get("hours_since_meal"),
        checkin_done=bool(log.get("morning_mood")),
        nocturnal_ratio=log.get("nocturnal_ratio", 0.0),
        days_active=days_active,
        days_since_active=days_since_active,
        current_streak=current_streak,
        is_evening=hour >= 21,
    )


def _select_specialist(ctx: UserContext, message: str, hour: int):
    """Return the best specialist for this context, or None to use default."""
    for specialist in _SPECIALISTS:
        if specialist.name == "morning":
            if specialist.should_activate(ctx, hour=hour):
                return specialist
        else:
            if specialist.should_activate(ctx):
                return specialist
    return None
```

Then update the `chat()` function to inject UserContext:

```python
def chat(user_id: str, message: str) -> dict:
    triage_result = run_triage(user_id)

    # GUARDRAIL — hard crisis bypass
    if triage_result["level"] == "crisis":
        mem.add_message(user_id, "user", message)
        mem.add_message(user_id, "assistant", CRISIS_RESPONSE)
        return {
            "reply": CRISIS_RESPONSE,
            "playbook_activated": "crisis-escalation",
            "suggested_habit": None,
        }

    # Build UserContext and check crisis keywords in message
    ctx = _build_user_context(user_id)
    hour = datetime.now(timezone.utc).hour

    # Check crisis keywords in message (Mood Agent rule)
    from agent.specialists.mood_agent import MoodAgent, CRISIS_KEYWORDS
    if any(kw in message.lower() for kw in CRISIS_KEYWORDS):
        mem.add_message(user_id, "user", message)
        mem.add_message(user_id, "assistant", CRISIS_RESPONSE)
        return {
            "reply": CRISIS_RESPONSE,
            "playbook_activated": "crisis-escalation",
            "suggested_habit": None,
        }

    # Select specialist
    specialist = _select_specialist(ctx, message, hour)
    active_system_prompt = specialist.system_prompt(ctx) if specialist else SYSTEM_PROMPT
    active_tools = specialist.tools if specialist else TOOLS

    triage_context = (
        f"\n\nCONTEXTO DE TRIAJE:\n"
        f"- Nivel: {triage_result['level']}\n"
        f"- Razón: {triage_result['reason']}"
    )
    if triage_result.get("playbook_slug"):
        triage_context += f"\n- Playbook sugerido: {triage_result['playbook_slug']}"

    mem.add_message(user_id, "user", message)

    messages = [
        {"role": "system", "content": active_system_prompt + triage_context},
        *mem.get_history(user_id),
    ]

    # ... (rest of the tool loop is unchanged)
```

- [ ] **Step 12: Run existing tests — expect no regressions**

```bash
cd agent-service
.venv/Scripts/pytest tests/ -v --ignore=tests/test_weekly_report.py -k "not weekly"
```
Expected: all pre-existing tests still pass, new tests pass.

- [ ] **Step 13: Commit**

```bash
git add agent-service/agent/specialists/ agent-service/agent/orchestrator.py agent-service/tests/test_specialists.py
git commit -m "feat(agent): add 6 specialized agents + orchestrator routing via UserContext"
```

---

## Task 4 — Extend triage with P3 (fuel_block) + P4 (sleep_block)

**Files:**
- Modify: `agent-service/triage/tree.py`
- Modify: `agent-service/tests/test_triage.py`

- [ ] **Step 1: Write new triage tests**

Add to the bottom of `agent-service/tests/test_triage.py`:

```python
# ─── P3: fuel_block ──────────────────────────────────────────────────────────

def test_p3_fuel_block_activates():
    """fuel_block_flag = True → nivel fuel, Focus bloqueado."""
    from unittest.mock import patch
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys()), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"hours_since_meal": 9.0}):
        result = tt.run_triage("u1")
    assert result["level"] == "fuel_block"
    assert result["playbook_slug"] == "fuel-block"


def test_p3_fuel_block_not_activated_under_threshold():
    from unittest.mock import patch
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys()), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"hours_since_meal": 7.0}):
        result = tt.run_triage("u1")
    assert result["level"] == "default"


def test_p4_sleep_block_activates():
    """sleep_hours < 5 AND hour >= 21 → nivel sleep_block."""
    from unittest.mock import patch
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys()), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"sleep_hours": 4.0}), \
         patch.object(tt, "_current_hour", return_value=22):
        result = tt.run_triage("u1")
    assert result["level"] == "sleep_block"


def test_crisis_takes_priority_over_fuel_block():
    from unittest.mock import patch
    import triage.tree as tt
    with patch.object(tt, "get_survey_scores", return_value=_surveys(phq9=18, crisis=True)), \
         patch.object(tt, "get_ml_scores", return_value=_ml_zero()), \
         patch.object(tt, "get_usage_summary", return_value=_usage_empty()), \
         patch.object(tt, "_safe_get_forecast", return_value=_forecast()), \
         patch.object(tt, "_get_daily_log", return_value={"hours_since_meal": 10.0}):
        result = tt.run_triage("u1")
    assert result["level"] == "crisis"
```

- [ ] **Step 2: Run new tests to confirm fail**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_triage.py -k "fuel_block or sleep_block" -v 2>&1 | head -20
```
Expected: `AttributeError` on `_get_daily_log`

- [ ] **Step 3: Update `triage/tree.py`**

Add at the top (after existing imports):

```python
from datetime import datetime, timezone


def _get_daily_log(user_id: str) -> dict:
    """Read today's daily log — isolated for testability."""
    try:
        from agent.daily_log import read_today_log
        return read_today_log(user_id)
    except Exception:
        return {}


def _current_hour() -> int:
    return datetime.now(timezone.utc).hour
```

Then in `run_triage`, insert after NIVEL 1 (crisis check) and before NIVEL 2:

```python
    # ── P3 — FUEL BLOCK (horas sin comer > 8) ────────────────────────────────
    daily_log = _get_daily_log(user_id)
    hours_since_meal = daily_log.get("hours_since_meal")
    if hours_since_meal is not None and hours_since_meal > 8:
        return {
            "level": "fuel_block",
            "playbook_slug": "fuel-block",
            "reason": f"Sin comer hace {hours_since_meal:.1f}h — Focus Agent bloqueado",
            "context": {"daily_log": daily_log},
        }

    # ── P4 — SLEEP BLOCK (< 5h de sueño Y es de noche) ───────────────────────
    sleep_hours = daily_log.get("sleep_hours")
    if sleep_hours is not None and sleep_hours < 5 and _current_hour() >= 21:
        return {
            "level": "sleep_block",
            "playbook_slug": "sleep-deprivation",
            "reason": f"Sueño insuficiente ({sleep_hours:.1f}h) y es noche — Focus bloqueado",
            "context": {"daily_log": daily_log},
        }
```

- [ ] **Step 4: Run all triage tests**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_triage.py -v
```
Expected: all existing tests + 4 new tests pass.

- [ ] **Step 5: Commit**

```bash
git add agent-service/triage/tree.py agent-service/tests/test_triage.py
git commit -m "feat(agent): extend triage with P3 fuel_block and P4 sleep_block rules"
```

---

## Task 5 — InsightAgent (weekly auto-analysis) ⭐ CRÍTICO

**Files:**
- Create: `agent-service/agent/specialists/insight_agent.py`
- Modify: `agent-service/agent/orchestrator.py` (extend `generate_weekly_report`)

- [ ] **Step 1: Write test**

Add to `agent-service/tests/test_specialists.py`:

```python
def test_insight_agent_prompt_contains_correlations():
    from agent.specialists.insight_agent import InsightAgent
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_active=10)
    agent = InsightAgent()
    prompt = agent.system_prompt(ctx)
    assert "correlacion" in prompt.lower() or "correlación" in prompt.lower()
    assert "sueño" in prompt.lower()
    assert "ánimo" in prompt.lower() or "animo" in prompt.lower()


def test_insight_agent_does_not_activate_before_7_days():
    from agent.specialists.insight_agent import InsightAgent
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_active=5)
    agent = InsightAgent()
    assert agent.should_activate(ctx) is False


def test_insight_agent_activates_at_7_days():
    from agent.specialists.insight_agent import InsightAgent
    from agent.user_context import UserContext
    ctx = UserContext(user_id="u1", days_active=7)
    agent = InsightAgent()
    assert agent.should_activate(ctx) is True
```

- [ ] **Step 2: Run to confirm fail**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_specialists.py -k "insight" -v 2>&1 | head -10
```

- [ ] **Step 3: Implement**

```python
# agent-service/agent/specialists/insight_agent.py
from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class InsightAgent(BaseSpecialist):
    name = "insight"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return ctx.days_active >= 7

    def system_prompt(self, ctx: UserContext) -> str:
        phase = _phase_label(ctx)
        return f"""Eres Kairós en modo Insight Agent. Generas el análisis semanal automático del usuario.

FASE DEL USUARIO: {phase}

INSTRUCCIONES:
1. USA get_usage_summary(days=7), get_survey_scores y get_ml_scores ANTES de escribir.
2. Genera EXACTAMENTE esta estructura:

**Esta semana para ti**

[1 frase de contexto con el dato más relevante de la semana]

**3 correlaciones de tus propios datos:**
- Sueño → ánimo: [dato específico]
- Pantallas → sueño: [dato específico]
- Comida → foco: [dato específico si hay data, omitir si no]

**Para la próxima semana:**
[1 sola recomendación — la más impactante. Sin listas.]

REGLAS CRÍTICAS:
- NUNCA estadísticas genéricas. Solo datos propios del usuario.
- Si no tienes suficientes datos para una correlación, omítela.
- Máximo 200 palabras.
- Tono: cálido, como un amigo que ha estado mirando tus datos con cariño.
- Habla siempre en español."""
```

- [ ] **Step 4: Run tests**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_specialists.py -v
```
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add agent-service/agent/specialists/insight_agent.py
git commit -m "feat(agent): add InsightAgent for weekly auto-analysis with correlations"
```

---

## Task 6 — ProgressAgent + phase system

**Files:**
- Create: `agent-service/agent/specialists/progress_agent.py`
- Create: `agent-service/routers/progress.py`
- Modify: `agent-service/main.py`

- [ ] **Step 1: Write test**

Add to `agent-service/tests/test_specialists.py`:

```python
def test_progress_agent_phase_1_prompt():
    from agent.specialists.progress_agent import ProgressAgent
    ctx = _ctx(days_active=5, current_streak=5)
    agent = ProgressAgent()
    prompt = agent.system_prompt(ctx)
    assert "fase 1" in prompt.lower() or "Fase 1" in prompt


def test_progress_agent_phase_3_does_not_explain_basics():
    from agent.specialists.progress_agent import ProgressAgent
    ctx = _ctx(days_active=70, current_streak=70)
    agent = ProgressAgent()
    prompt = agent.system_prompt(ctx)
    # Phase 3 should challenge, not explain
    assert "reta" in prompt.lower() or "reto" in prompt.lower() or "autonomía" in prompt.lower()
```

- [ ] **Step 2: Implement ProgressAgent**

```python
# agent-service/agent/specialists/progress_agent.py
from agent.specialists.base import BaseSpecialist, _phase_label
from agent.user_context import UserContext


class ProgressAgent(BaseSpecialist):
    name = "progress"

    def should_activate(self, ctx: UserContext, **kwargs) -> bool:
        return False  # Called explicitly by dashboard endpoint, not via chat routing

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
                "La racha NO se borró — está pausada. "
                "Mensaje: 'Tu racha de {ctx.current_streak} días sigue guardada. ¿Qué pasó?' "
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
```

- [ ] **Step 3: Add dashboard progress endpoint**

```python
# agent-service/routers/progress.py
from fastapi import APIRouter, Depends
from auth import get_current_user
from agent.daily_log import read_today_log
from agent.tools.get_usage_summary import get_usage_summary
from database import supabase
from datetime import date

router = APIRouter(prefix="/api/v1/progress", tags=["progress"])


@router.get("/summary")
async def progress_summary(user_id: str = Depends(get_current_user)):
    """Returns phase, streak, and 14-day trend for the dashboard."""
    log = read_today_log(user_id)

    # Fetch streak
    streak_data = {"current_streak": 0, "longest_streak": 0, "streak_paused": False}
    try:
        res = (supabase.table("streaks")
               .select("current_streak,longest_streak,last_completion")
               .eq("user_id", user_id).limit(1).execute())
        if res.data:
            row = res.data[0]
            current = row.get("current_streak", 0)
            last = row.get("last_completion")
            days_since = 0
            if last:
                days_since = (date.today() - date.fromisoformat(str(last))).days
            streak_data = {
                "current_streak": current,
                "longest_streak": row.get("longest_streak", 0),
                "streak_paused": days_since >= 3,
                "days_since_active": days_since,
            }
    except Exception:
        pass

    # Phase
    days_active = streak_data["current_streak"]
    user_phase = 3 if days_active >= 60 else (2 if days_active >= 15 else 1)

    usage = get_usage_summary(user_id, days=14)

    return {
        "user_phase": user_phase,
        "phase_label": {1: "Observación", 2: "Correlaciones", 3: "Retos"}[user_phase],
        "days_active": days_active,
        **streak_data,
        "today_log": log,
        "usage_14d": usage,
    }
```

- [ ] **Step 4: Register router in main.py**

Edit `agent-service/main.py`. Find where routers are included and add:

```python
from routers.progress import router as progress_router
app.include_router(progress_router)
```

- [ ] **Step 5: Run tests**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_specialists.py -v
```

- [ ] **Step 6: Commit**

```bash
git add agent-service/agent/specialists/progress_agent.py agent-service/routers/progress.py agent-service/main.py agent-service/tests/test_specialists.py
git commit -m "feat(agent): add ProgressAgent + /api/v1/progress/summary endpoint for dashboard"
```

---

## Task 7 — Full integration test (smoke test)

**Files:**
- Create: `agent-service/tests/test_orchestrator_specialists.py`

- [ ] **Step 1: Write integration smoke tests**

```python
# agent-service/tests/test_orchestrator_specialists.py
"""
Integration smoke tests for the specialist-routing orchestrator.
All Supabase + LLM calls are mocked.
"""
from unittest.mock import patch, MagicMock
import agent.orchestrator as orch


def _mock_llm_response(text: str):
    choice = MagicMock()
    choice.finish_reason = "stop"
    choice.message.content = text
    choice.message.tool_calls = None
    resp = MagicMock()
    resp.choices = [choice]
    return resp


def _patch_all(phq9=2, gad7=2, log=None, relapse=0.0):
    """Return a list of patches that mock all external calls."""
    surveys = {
        "phq9_score": phq9, "phq9_prev_score": None,
        "phq9_interpretation": "mínimo",
        "gad7_score": gad7, "gad7_prev_score": None,
        "gad7_interpretation": "mínimo",
        "crisis_flag": phq9 >= 15 or gad7 >= 15,
    }
    ml = {
        "attention_fragmentation_score": 0.3,
        "nocturnal_pattern_score": 0.3,
        "doomscrolling_score": 0.3,
        "anomaly_flag": False,
        "anomaly_severity": 0.0,
        "has_ml_data": False,
    }
    forecast = {"relapse_risk_score": relapse, "trend_direction": "stable", "has_forecast": False}
    usage = {"top_domains": [], "today_minutes": 0, "avg_daily_minutes": 0, "days_with_data": 0}
    cv = {"cv_available": False}
    daily = log or {}

    return [
        patch("agent.orchestrator.get_survey_scores", return_value=surveys),
        patch("agent.orchestrator.get_ml_scores", return_value=ml),
        patch("agent.orchestrator.get_usage_summary", return_value=usage),
        patch("triage.tree.get_survey_scores", return_value=surveys),
        patch("triage.tree.get_ml_scores", return_value=ml),
        patch("triage.tree.get_usage_summary", return_value=usage),
        patch("triage.tree._safe_get_forecast", return_value=forecast),
        patch("triage.tree.get_cv_scores", return_value=cv),
        patch("agent.orchestrator.read_today_log", return_value=daily),
        patch("agent.orchestrator.client") as _client_mock,
    ]


def test_crisis_short_circuits_llm():
    patches = _patch_all(phq9=18)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9] as mock_client:
        result = orch.chat(user_id="u1", message="hola")
    assert result["playbook_activated"] == "crisis-escalation"
    mock_client.chat.completions.create.assert_not_called()


def test_crisis_keyword_in_message_short_circuits():
    patches = _patch_all(phq9=3)
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9] as mock_client:
        result = orch.chat(user_id="u1", message="quiero suicidarme")
    assert result["playbook_activated"] == "crisis-escalation"
    mock_client.chat.completions.create.assert_not_called()


def test_morning_agent_selected_before_11am_no_checkin():
    patches = _patch_all()
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9] as mock_client:
        mock_client.chat.completions.create.return_value = _mock_llm_response("Buenos días!")
        with patch("agent.orchestrator._current_hour", return_value=9):
            result = orch.chat(user_id="u1", message="buenos días")
    # Check that Morning Agent system prompt was injected
    call_args = mock_client.chat.completions.create.call_args
    system_msg = call_args[1]["messages"][0]["content"]
    assert "Morning Agent" in system_msg


def test_default_agent_used_when_no_specialist_matches():
    patches = _patch_all()
    with patches[0], patches[1], patches[2], patches[3], patches[4], \
         patches[5], patches[6], patches[7], patches[8], patches[9] as mock_client:
        mock_client.chat.completions.create.return_value = _mock_llm_response("Hola!")
        # checkin done, afternoon, no flags
        with patch("agent.orchestrator.read_today_log", return_value={"morning_mood": 4}):
            with patch("agent.orchestrator._current_hour", return_value=15):
                result = orch.chat(user_id="u1", message="hola")
    call_args = mock_client.chat.completions.create.call_args
    system_msg = call_args[1]["messages"][0]["content"]
    # Default SYSTEM_PROMPT contains "copiloto de bienestar"
    assert "copiloto" in system_msg.lower()
```

- [ ] **Step 2: Run integration tests**

```bash
cd agent-service
.venv/Scripts/pytest tests/test_orchestrator_specialists.py -v
```
Expected: `4 passed`

- [ ] **Step 3: Run full test suite**

```bash
cd agent-service
.venv/Scripts/pytest tests/ -v 2>&1 | tail -20
```
Expected: all tests green. Note the count.

- [ ] **Step 4: Final commit**

```bash
git add agent-service/tests/test_orchestrator_specialists.py
git commit -m "test(agent): integration smoke tests for specialist routing + crisis guardrails"
```

---

## Self-review

**1. Spec coverage:**

| Spec requirement | Task |
|---|---|
| Core orquestador construye UserContext | Task 3 (orchestrator update) |
| Árbol de triaje P3 fuel_block | Task 4 |
| Árbol de triaje P4 sleep_block | Task 4 |
| Morning Agent (3 preguntas, streak pause) | Task 3 (MorningAgent) |
| Mood Agent (override, crisis keywords, affect labeling) | Task 3 (MoodAgent) |
| Sleep Agent (morning + noche 22:00) | Task 3 (SleepAgent) |
| Focus Agent (sesiones, recall, bloqueo ansioso) | Task 3 (FocusAgent) |
| Screen Agent (extensión + autoreporte) | Task 3 (ScreenAgent) |
| Fuel Agent (fuel_block_flag, P3 triage) | Task 3 (FuelAgent) + Task 4 |
| Insight Agent (análisis semanal, correlaciones) | Task 5 |
| Progress Agent (fases, racha pausada, dashboard) | Task 6 |
| DailyLog persistence | Task 2 |
| Phase system (1→2→3) | Task 1 (UserContext.user_phase) |
| Streak pause when ≥ 3 days absent | Task 1 (UserContext.streak_paused) |
| Crisis keyword detection in message | Task 3 (orchestrator update) |

All requirements covered. ✅

**2. Placeholder scan:** No TBD, no TODO, no "add validation" patterns. All code blocks are complete. ✅

**3. Type consistency:**
- `UserContext.user_phase` returns `int` — used in `_phase_label()` which maps `{1,2,3}` → consistent.
- `upsert_daily_log(user_id: str, updates: dict)` — all callers in specialist prompts describe the exact dict shape.
- `run_triage` returns `{"level": str, "playbook_slug": str|None, "reason": str, "context": dict}` — new levels `fuel_block` and `sleep_block` follow same shape. ✅

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-24-kairos-specialized-agents.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
