import json
from openai import OpenAI, APIError, AuthenticationError
from fastapi import HTTPException
from config import settings
from triage.tree import run_triage
from agent.tools.get_usage_summary import get_usage_summary
from agent.tools.get_survey_scores import get_survey_scores
from agent.tools.get_ml_scores import get_ml_scores
from agent.tools.search_playbooks import search_playbooks
from agent import memory as mem

client = OpenAI(
    api_key=settings.anthropic_api_key,
    base_url="https://openrouter.ai/api/v1",
)

MODEL = "anthropic/claude-sonnet-4-5"

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
            "description": "Obtiene los scores de los modelos ML: attention_fragmentation, nocturnal_pattern, doomscrolling.",
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

REGLAS CRÍTICAS:
1. NUNCA diagnostiques: no digas "tienes depresión", "tienes ansiedad", "tienes ADHD". Usa palabras como "señales", "patrones", "indicadores".
2. SIEMPRE usa search_playbooks antes de dar recomendaciones de hábitos o intervenciones.
3. Si el usuario muestra señales de crisis (phq9 >= 15 o gad7 >= 15), deriva INMEDIATAMENTE: "📞 Línea 106 — Salud mental, gratuita, 24 horas."
4. Compara siempre contra el historial propio del usuario, nunca contra otros.
5. Usa un tono cálido, sin juicios, compasivo.
6. Respuestas concisas: máximo 3-4 párrafos.
7. Habla siempre en español.
8. Si sugieres un hábito específico, añade al final de tu respuesta exactamente esta línea:
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
        elif tool_name == "search_playbooks":
            result = search_playbooks(**tool_input)
        else:
            result = {"error": f"Herramienta desconocida: {tool_name}"}
        return json.dumps(result, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})


def chat(user_id: str, message: str) -> dict:
    triage_result = run_triage(user_id)

    triage_context = (
        f"\n\nCONTEXTO DE TRIAJE:\n"
        f"- Nivel: {triage_result['level']}\n"
        f"- Razón: {triage_result['reason']}"
    )
    if triage_result.get("playbook_slug"):
        triage_context += f"\n- Playbook sugerido: {triage_result['playbook_slug']}"

    mem.add_message(user_id, "user", message)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + triage_context},
        *mem.get_history(user_id),
    ]

    final_text = ""

    while True:
        try:
            response = client.chat.completions.create(
                model=MODEL,
                max_tokens=1024,
                tools=TOOLS,
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
