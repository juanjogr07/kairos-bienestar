import json
from openai import OpenAI
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

SYSTEM_PROMPT = """Eres Kairós, un copiloto de bienestar digital. Tu rol es ayudar a las personas a entender sus patrones de uso digital y acompañarlas hacia mayor bienestar.

REGLAS CRÍTICAS:
1. NUNCA diagnostiques: no digas "tienes depresión", "tienes ansiedad", "tienes ADHD". Usa palabras como "señales", "patrones", "indicadores".
2. SIEMPRE usa search_playbooks antes de dar recomendaciones de hábitos o intervenciones.
3. Si el usuario muestra señales de crisis (phq9 >= 15 o gad7 >= 15), deriva INMEDIATAMENTE: "📞 Línea 106 — Salud mental, gratuita, 24 horas."
4. Compara siempre contra el historial propio del usuario, nunca contra otros.
5. Usa un tono cálido, sin juicios, compasivo.
6. Respuestas concisas: máximo 3-4 párrafos.
7. Habla siempre en español."""


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
        response = client.chat.completions.create(
            model=MODEL,
            max_tokens=1024,
            tools=TOOLS,
            messages=messages,
        )

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

    mem.add_message(user_id, "assistant", final_text)

    return {
        "reply": final_text,
        "playbook_activated": triage_result.get("playbook_slug"),
        "suggested_habit": None,
    }
