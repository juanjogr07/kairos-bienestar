"""
Tests para agent/orchestrator.py — US-AI-002 suggested habit extraction.

Mockea el cliente OpenAI (OpenRouter) y todas las dependencias de DB
para ejecutar sin credenciales reales.
"""
from unittest.mock import patch, MagicMock
import json


# ─── helpers para construir respuestas fake de OpenAI ─────────────────────────

def _make_choice(content: str, finish_reason: str = "stop"):
    choice = MagicMock()
    choice.finish_reason = finish_reason
    choice.message.content = content
    choice.message.tool_calls = []
    return choice


def _make_response(content: str, finish_reason: str = "stop"):
    resp = MagicMock()
    resp.choices = [_make_choice(content, finish_reason)]
    return resp


def _make_tool_call(name: str, args: dict, call_id: str = "call_1"):
    tc = MagicMock()
    tc.id = call_id
    tc.function.name = name
    tc.function.arguments = json.dumps(args)
    return tc


def _make_tool_response(tool_calls, content: str = None):
    """Primera vuelta del loop: finish_reason=tool_calls."""
    choice = MagicMock()
    choice.finish_reason = "tool_calls"
    choice.message.content = content
    choice.message.tool_calls = tool_calls
    resp = MagicMock()
    resp.choices = [choice]
    return resp


# ─── fixture: triaje y tools mockeados ────────────────────────────────────────

TRIAGE_DIGITAL = {
    "level": "digital",
    "playbook_slug": "doomscrolling",
    "reason": "doomscrolling_score = 0.80",
    "context": {},
}

TRIAGE_DEFAULT = {
    "level": "default",
    "playbook_slug": None,
    "reason": "Sin señales activas",
    "context": {},
}


# ─── US-AI-002: extracción del marcador HÁBITO_SUGERIDO ───────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_suggested_habit_extracted(mock_client, mock_mem, mock_triage):
    """El marcador se extrae, suggested_habit tiene el nombre del hábito."""
    mock_mem.get_history.return_value = []
    reply_with_marker = (
        "Noto que pasas mucho tiempo en scroll. "
        "Te recomiendo establecer un límite diario.\n"
        "HÁBITO_SUGERIDO: Límite 30 min Instagram"
    )
    mock_client.chat.completions.create.return_value = _make_response(reply_with_marker)

    from agent.orchestrator import chat
    result = chat("user-1", "¿Cómo estoy?")

    assert result["suggested_habit"] == "Límite 30 min Instagram"
    assert "HÁBITO_SUGERIDO" not in result["reply"]


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_no_habit_marker_returns_none(mock_client, mock_mem, mock_triage):
    """Si el LLM no incluye el marcador, suggested_habit es None."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(
        "Tus patrones digitales muestran algunas señales. Sigue pendiente de tu uso."
    )

    from agent.orchestrator import chat
    result = chat("user-1", "¿Cómo estoy?")

    assert result["suggested_habit"] is None
    assert result["reply"] == "Tus patrones digitales muestran algunas señales. Sigue pendiente de tu uso."


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_marker_not_visible_in_reply(mock_client, mock_mem, mock_triage):
    """El marcador HÁBITO_SUGERIDO no debe aparecer en el reply final."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(
        "Texto útil para el usuario.\nHÁBITO_SUGERIDO: Sin teléfono primera hora"
    )

    from agent.orchestrator import chat
    result = chat("user-1", "Dame un consejo")

    assert "HÁBITO_SUGERIDO" not in result["reply"]
    assert result["reply"] == "Texto útil para el usuario."


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_habit_truncated_at_60_chars(mock_client, mock_mem, mock_triage):
    """Si el nombre del hábito supera 60 chars, se trunca."""
    mock_mem.get_history.return_value = []
    long_name = "A" * 80
    mock_client.chat.completions.create.return_value = _make_response(
        f"Respuesta corta.\nHÁBITO_SUGERIDO: {long_name}"
    )

    from agent.orchestrator import chat
    result = chat("user-1", "Hola")

    assert len(result["suggested_habit"]) == 60


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_empty_habit_after_marker_returns_none(mock_client, mock_mem, mock_triage):
    """HÁBITO_SUGERIDO: sin texto → suggested_habit es None, no string vacío."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(
        "Respuesta.\nHÁBITO_SUGERIDO: "
    )

    from agent.orchestrator import chat
    result = chat("user-1", "Hola")

    assert result["suggested_habit"] is None


# ─── Contrato del response dict ───────────────────────────────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_response_has_all_required_keys(mock_client, mock_mem, mock_triage):
    """chat() siempre devuelve reply, playbook_activated, suggested_habit."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response("Ok.")

    from agent.orchestrator import chat
    result = chat("user-1", "Test")

    assert "reply" in result
    assert "playbook_activated" in result
    assert "suggested_habit" in result


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_playbook_activated_from_triage(mock_client, mock_mem, mock_triage):
    """playbook_activated viene del triage, no del texto del LLM."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response("Texto.")

    from agent.orchestrator import chat
    result = chat("user-1", "Test")

    assert result["playbook_activated"] == "doomscrolling"


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_playbook_activated_none_when_default(mock_client, mock_mem, mock_triage):
    """Si el triaje devuelve default, playbook_activated es None."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response("Texto.")

    from agent.orchestrator import chat
    result = chat("user-1", "Test")

    assert result["playbook_activated"] is None


# ─── Agentic loop: tool_calls → segunda vuelta ────────────────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DIGITAL)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator._execute_tool", return_value='{"doomscrolling_score": 0.85}')
def test_tool_call_loop_resolves(mock_exec, mock_client, mock_mem, mock_triage):
    """Si el LLM pide una tool, el loop continúa y extrae el texto final."""
    mock_mem.get_history.return_value = []
    tc = _make_tool_call("get_ml_scores", {"user_id": "user-1"})
    first_response = _make_tool_response([tc])
    second_response = _make_response(
        "Tu doomscrolling es alto.\nHÁBITO_SUGERIDO: Límite 30 min redes"
    )
    mock_client.chat.completions.create.side_effect = [first_response, second_response]

    from agent.orchestrator import chat
    result = chat("user-1", "¿Cómo estoy?")

    assert mock_client.chat.completions.create.call_count == 2
    assert result["suggested_habit"] == "Límite 30 min redes"
    assert "HÁBITO_SUGERIDO" not in result["reply"]


# ─── Marker en medio del texto (no al final) ──────────────────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
def test_marker_in_middle_of_text(mock_client, mock_mem, mock_triage):
    """El marcador se extrae aunque no esté en la última línea."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(
        "Primera línea.\nHÁBITO_SUGERIDO: Meditación 10 minutos\nÚltima línea."
    )

    from agent.orchestrator import chat
    result = chat("user-1", "Test")

    assert result["suggested_habit"] == "Meditación 10 minutos"
    assert "HÁBITO_SUGERIDO" not in result["reply"]
    assert "Primera línea." in result["reply"]
    assert "Última línea." in result["reply"]
