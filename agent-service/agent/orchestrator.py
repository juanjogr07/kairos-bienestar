import json
from datetime import datetime, timezone
from openai import OpenAI, APIError, AuthenticationError
from fastapi import HTTPException
from config import settings
from triage.tree import run_triage
from triage.crisis_escalation import CRISIS_RESPONSE as _CRISIS_RESPONSE
from agent.tools.get_usage_summary import get_usage_summary
from agent.tools.get_survey_scores import get_survey_scores
from agent.tools.get_ml_scores import get_ml_scores
from agent.tools.get_anomaly_flags import get_anomaly_flags
from agent.tools.get_forecast import get_forecast
from agent.tools.search_playbooks import search_playbooks
from agent import memory as mem
from agent.user_context import UserContext
from agent.daily_log import read_today_log, upsert_daily_log
from agent.specialists.morning_agent import MorningAgent
from agent.specialists.mood_agent import MoodAgent, CRISIS_KEYWORDS
from agent.specialists.sleep_agent import SleepAgent
from agent.specialists.focus_agent import FocusAgent
from agent.specialists.screen_agent import ScreenAgent
from agent.specialists.fuel_agent import FuelAgent

_SPECIALISTS = [MoodAgent(), FuelAgent(), SleepAgent(), FocusAgent(), ScreenAgent(), MorningAgent()]


def _current_hour() -> int:
    return datetime.now(timezone.utc).hour


def _build_user_context(user_id: str) -> UserContext:
    """Assemble UserContext from Supabase in one pass."""
    surveys = get_survey_scores(user_id)
    log = read_today_log(user_id)
    hour = _current_hour()

    days_active = 0
    days_since_active = 0
    current_streak = 0
    try:
        from database import supabase
        from datetime import date
        res = (supabase.table("streaks")
               .select("current_streak,longest_streak,last_completion")
               .eq("user_id", user_id)
               .limit(1).execute())
        if res.data:
            row = res.data[0]
            current_streak = row.get("current_streak", 0)
            last = row.get("last_completion")
            if last:
                days_since_active = (date.today() - date.fromisoformat(str(last))).days
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


def _select_specialist(ctx: UserContext, hour: int):
    """Return the best specialist for this context, or None to use default."""
    for specialist in _SPECIALISTS:
        if specialist.name == "morning":
            if specialist.should_activate(ctx, hour=hour):
                return specialist
        else:
            if specialist.should_activate(ctx):
                return specialist
    return None

client = OpenAI(
    api_key=settings.anthropic_api_key,
    base_url="https://openrouter.ai/api/v1",
)

MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_usage_summary",
            "description": "Obtiene resumen del uso digital del usuario en los últimos N días: top dominios, minutos totales, promedio diario.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "days": {"type": "integer", "default": 7},
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_survey_scores",
            "description": "Obtiene los últimos scores de PHQ-9 (ánimo) y GAD-7 (ansiedad) del usuario.",
            "parameters": {
                "type": "object",
                "properties": {"user_id": {"type": "string"}},
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_ml_scores",
            "description": "Obtiene los scores ML del usuario: attention_fragmentation, nocturnal_pattern, doomscrolling, anomaly_flag, cluster_name. Usar cuando el usuario pregunte sobre sus patrones digitales.",
            "parameters": {
                "type": "object",
                "properties": {"user_id": {"type": "string"}},
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_anomaly_flags",
            "description": "Obtiene los días atípicos detectados por el modelo Isolation Forest en los últimos N días. Usar cuando el usuario pregunte sobre días inusuales o picos de uso.",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"},
                    "days": {"type": "integer", "default": 7},
                },
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "Obtiene la predicción Prophet de uso digital para los próximos 7 días y el score de riesgo de recaída. Usar cuando el usuario pregunte sobre tendencias futuras.",
            "parameters": {
                "type": "object",
                "properties": {"user_id": {"type": "string"}},
                "required": ["user_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_playbooks",
            "description": "Busca playbooks de bienestar basados en evidencia científica usando búsqueda semántica. Usar SIEMPRE antes de dar recomendaciones.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "default": 2},
                },
                "required": ["query"],
            },
        },
    },
]

HABIT_MARKER = "HÁBITO_SUGERIDO:"

CRISIS_RESPONSE = _CRISIS_RESPONSE

WEEKLY_REPORT_PROMPT = """Genera un reporte semanal de bienestar digital en formato Markdown.
Usa PRIMERO get_usage_summary (days=7), get_survey_scores y get_ml_scores para recopilar los datos antes de redactar.

Estructura OBLIGATORIA (incluye exactamente estos encabezados):

## Resumen de la semana
[2 líneas con los hallazgos principales]

## Uso Digital
[minutos totales, top 3 dominios, comparación con semana anterior si existe]

## Estado de Ánimo
[PHQ-9 actual y tendencia vs semana anterior]

## Hábitos
[completados / total, mejor racha]

## Para la próxima semana
[1 sugerencia concreta y accionable basada en los datos]

Tono: cálido, motivador, sin juicios. Máximo 300 palabras. Habla en español."""

SYSTEM_PROMPT = """Eres Kairós, un copiloto de bienestar digital. Tu rol es ayudar a las personas a entender sus patrones de uso digital y acompañarlas hacia mayor bienestar.

HERRAMIENTAS DISPONIBLES:
- get_usage_summary: uso digital reciente (minutos, top apps, promedio diario)
- get_survey_scores: PHQ-9 (ánimo) y GAD-7 (ansiedad) del usuario
- get_ml_scores: señales ML — doomscrolling, patrón nocturno, fragmentación de atención, perfil de uso (cluster)
- get_anomaly_flags: días atípicos detectados por modelos de anomalías
- get_forecast: predicción de uso a 7 días y riesgo de recaída (Prophet)
- search_playbooks: buscar intervenciones basadas en evidencia (SIEMPRE antes de recomendar)

REGLAS CRÍTICAS:
1. NUNCA diagnostiques: no digas "tienes depresión", "tienes ansiedad", "tienes ADHD". Usa palabras como "señales", "patrones", "indicadores".
2. SIEMPRE usa search_playbooks antes de dar recomendaciones de hábitos o intervenciones.
3. Si el usuario muestra señales de crisis (phq9 >= 15 o gad7 >= 15), deriva INMEDIATAMENTE: "📞 Línea 106 — Salud mental, gratuita, 24 horas."
4. Compara siempre contra el historial propio del usuario, nunca contra otros usuarios.
5. Usa un tono cálido, sin juicios, compasivo.
6. Respuestas concisas: máximo 3-4 párrafos.
7. Habla siempre en español.
8. Cuando menciones scores ML, explica en lenguaje humano qué significan (ej: "pasas mucho tiempo en redes sociales de noche" en vez de "nocturnal_pattern_score = 0.71").
9. Si sugieres un hábito específico, añade al final de tu respuesta exactamente esta línea:
HÁBITO_SUGERIDO: <nombre del hábito, máximo 5 palabras>
Esta línea no la ve el usuario — es solo para el sistema. No la incluyas si no sugieres un hábito concreto."""


def _execute_tool(tool_name: str, tool_input: dict) -> str:
    try:
        if tool_name == "get_usage_summary":
            result = get_usage_summary(**tool_input)
        elif tool_name == "get_survey_scores":
            result = get_survey_scores(**tool_input)
        elif tool_name == "get_ml_scores":
            result = get_ml_scores(**tool_input)
        elif tool_name == "get_anomaly_flags":
            result = get_anomaly_flags(**tool_input)
        elif tool_name == "get_forecast":
            result = get_forecast(**tool_input)
        elif tool_name == "search_playbooks":
            result = search_playbooks(**tool_input)
        else:
            result = {"error": f"Herramienta desconocida: {tool_name}"}
        return json.dumps(result, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def chat(user_id: str, message: str) -> dict:
    triage_result = run_triage(user_id)

    # GUARDRAIL — hard crisis bypass (triage score)
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
    hour = _current_hour()

    if any(kw in message.lower() for kw in CRISIS_KEYWORDS):
        mem.add_message(user_id, "user", message)
        mem.add_message(user_id, "assistant", CRISIS_RESPONSE)
        return {
            "reply": CRISIS_RESPONSE,
            "playbook_activated": "crisis-escalation",
            "suggested_habit": None,
        }

    # Select specialist
    specialist = _select_specialist(ctx, hour)
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

    final_text = ""

    while True:
        try:
            response = client.chat.completions.create(
                model=MODEL,
                max_tokens=1024,
                tools=active_tools or None,
                messages=messages,
            )
        except AuthenticationError as exc:
            raise HTTPException(status_code=503, detail="LLM service authentication failed — check API key") from exc
        except APIError as exc:
            raise HTTPException(status_code=503, detail=f"LLM service error: {exc.message}") from exc

        choice = response.choices[0]

        if choice.finish_reason == "tool_calls":
            tool_calls = choice.message.tool_calls
            messages.append({
                "role": "assistant",
                "content": choice.message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                    }
                    for tc in tool_calls
                ],
            })
            for tc in tool_calls:
                result = _execute_tool(tc.function.name, json.loads(tc.function.arguments))
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": result,
                })
        else:
            final_text = choice.message.content or ""
            break

    suggested_habit = None
    if HABIT_MARKER in final_text:
        lines = final_text.split("\n")
        for line in lines:
            stripped = line.strip()
            if stripped.startswith(HABIT_MARKER):
                raw = stripped[len(HABIT_MARKER):].strip()
                suggested_habit = raw[:60] if raw else None
                final_text = final_text.replace(line, "").strip()
                break

    mem.add_message(user_id, "assistant", final_text)

    return {
        "reply": final_text,
        "playbook_activated": triage_result.get("playbook_slug"),
        "suggested_habit": suggested_habit,
    }


def generate_weekly_report(user_id: str) -> dict:
    usage = get_usage_summary(user_id, days=7)
    if usage.get("days_with_data", 0) < 3:
        return {
            "reply": (
                "Necesito al menos 3 días de datos para generar tu reporte semanal. "
                "Sigue usando Kairós esta semana y vuelve pronto."
            ),
            "playbook_activated": None,
            "suggested_habit": None,
        }
    return chat(user_id=user_id, message=WEEKLY_REPORT_PROMPT)
