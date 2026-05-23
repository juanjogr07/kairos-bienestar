"""
Tests para agent/orchestrator.py — US-AI-003 weekly report generation.

Mockea OpenAI (OpenRouter), triage y todas las dependencias de DB.
"""
from unittest.mock import patch, MagicMock
import json


# ─── helpers reutilizados de test_orchestrator ────────────────────────────────

def _make_choice(content: str, finish_reason: str = "stop"):
    choice = MagicMock()
    choice.finish_reason = finish_reason
    choice.message.content = content
    choice.message.tool_calls = []
    return choice


def _make_response(content: str):
    resp = MagicMock()
    resp.choices = [_make_choice(content)]
    return resp


TRIAGE_DEFAULT = {
    "level": "default",
    "playbook_slug": None,
    "reason": "Sin señales activas",
    "context": {},
}

USAGE_SUFFICIENT = {
    "top_domains": [
        {"domain": "youtube.com", "minutes": 120},
        {"domain": "instagram.com", "minutes": 60},
        {"domain": "reddit.com", "minutes": 30},
    ],
    "today_minutes": 90,
    "avg_daily_minutes": 70,
    "days_with_data": 5,
}

USAGE_INSUFFICIENT = {
    "top_domains": [],
    "today_minutes": 10,
    "avg_daily_minutes": 10,
    "days_with_data": 2,
}

SAMPLE_REPORT = """## Resumen de la semana
Esta semana usaste más YouTube y Instagram que el promedio.

## Uso Digital
Total: 490 min (7 días). Top dominios: YouTube (120 min), Instagram (60 min).

## Estado de Ánimo
PHQ-9: 9 (leve). Sin cambio significativo respecto a la semana anterior.

## Hábitos
3 de 5 hábitos completados. Mejor racha: 4 días.

## Para la próxima semana
Establece un límite de 30 min diarios en Instagram."""


# ─── test: reporte generado cuando hay suficientes datos ─────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator.get_usage_summary", return_value=USAGE_SUFFICIENT)
def test_weekly_report_generated_with_sufficient_data(
    mock_usage, mock_client, mock_mem, mock_triage
):
    """Con >= 3 días de datos, el reporte usa el LLM y retorna Markdown."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(SAMPLE_REPORT)

    from agent.orchestrator import generate_weekly_report
    result = generate_weekly_report("user-1")

    assert mock_client.chat.completions.create.called
    assert "## Uso Digital" in result["reply"]
    assert "## Estado de Ánimo" in result["reply"]
    assert "## Hábitos" in result["reply"]


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator.get_usage_summary", return_value=USAGE_INSUFFICIENT)
def test_weekly_report_skips_llm_when_insufficient_data(
    mock_usage, mock_client, mock_mem, mock_triage
):
    """Con < 3 días de datos, NO llama al LLM y retorna mensaje informativo."""
    mock_mem.get_history.return_value = []

    from agent.orchestrator import generate_weekly_report
    result = generate_weekly_report("user-1")

    mock_client.chat.completions.create.assert_not_called()
    assert result["reply"] != ""
    assert result["playbook_activated"] is None
    assert result["suggested_habit"] is None


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator.get_usage_summary", return_value=USAGE_INSUFFICIENT)
def test_weekly_report_insufficient_data_message_is_helpful(
    mock_usage, mock_client, mock_mem, mock_triage
):
    """El mensaje de datos insuficientes orienta al usuario."""
    mock_mem.get_history.return_value = []

    from agent.orchestrator import generate_weekly_report
    result = generate_weekly_report("user-1")

    reply = result["reply"].lower()
    assert any(word in reply for word in ["datos", "días", "semana", "kairos", "kairós"])


# ─── test: contrato del response dict ─────────────────────────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator.get_usage_summary", return_value=USAGE_SUFFICIENT)
def test_weekly_report_always_returns_required_keys(
    mock_usage, mock_client, mock_mem, mock_triage
):
    """generate_weekly_report siempre retorna reply, playbook_activated, suggested_habit."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(SAMPLE_REPORT)

    from agent.orchestrator import generate_weekly_report
    result = generate_weekly_report("user-1")

    assert "reply" in result
    assert "playbook_activated" in result
    assert "suggested_habit" in result


@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator.get_usage_summary", return_value=USAGE_INSUFFICIENT)
def test_weekly_report_insufficient_data_has_required_keys(
    mock_usage, mock_client, mock_mem, mock_triage
):
    """El early-return también respeta el contrato del response dict."""
    mock_mem.get_history.return_value = []

    from agent.orchestrator import generate_weekly_report
    result = generate_weekly_report("user-1")

    assert "reply" in result
    assert "playbook_activated" in result
    assert "suggested_habit" in result


# ─── test: exact threshold ────────────────────────────────────────────────────

@patch("agent.orchestrator.run_triage", return_value=TRIAGE_DEFAULT)
@patch("agent.orchestrator.mem")
@patch("agent.orchestrator.client")
@patch("agent.orchestrator.get_usage_summary", return_value={**USAGE_INSUFFICIENT, "days_with_data": 3})
def test_weekly_report_exactly_3_days_calls_llm(
    mock_usage, mock_client, mock_mem, mock_triage
):
    """Exactamente 3 días de datos sí llama al LLM (límite inclusivo)."""
    mock_mem.get_history.return_value = []
    mock_client.chat.completions.create.return_value = _make_response(SAMPLE_REPORT)

    from agent.orchestrator import generate_weekly_report
    result = generate_weekly_report("user-1")

    assert mock_client.chat.completions.create.called


# ─── test: prompt contiene las secciones requeridas ──────────────────────────

def test_weekly_report_prompt_has_required_sections():
    """WEEKLY_REPORT_PROMPT incluye las 5 secciones del spec."""
    from agent.orchestrator import WEEKLY_REPORT_PROMPT

    for section in ["## Uso Digital", "## Estado de Ánimo", "## Hábitos", "## Para la próxima semana"]:
        assert section in WEEKLY_REPORT_PROMPT, f"Sección faltante: {section}"


def test_weekly_report_prompt_mentions_markdown():
    """El prompt instruye al LLM a usar formato Markdown."""
    from agent.orchestrator import WEEKLY_REPORT_PROMPT

    assert "Markdown" in WEEKLY_REPORT_PROMPT or "markdown" in WEEKLY_REPORT_PROMPT.lower()
