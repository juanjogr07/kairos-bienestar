"""
Agent E2E tests — verifies the full triage → orchestrator → response pipeline
using mocked LLM and Supabase dependencies.
"""
from unittest.mock import patch, MagicMock
from triage.crisis_escalation import CRISIS_RESPONSE


def _make_triage(level: str, playbook_slug=None, reason="test"):
    return {
        "level": level,
        "playbook_slug": playbook_slug,
        "reason": reason,
        "context": {},
    }


def _mock_llm_response(text: str):
    choice = MagicMock()
    choice.message.content = text
    choice.message.tool_calls = None
    choice.finish_reason = "stop"
    resp = MagicMock()
    resp.choices = [choice]
    return resp


class TestCrisisGuardrailE2E:
    def test_crisis_bypasses_llm(self):
        from agent.orchestrator import chat
        with patch("agent.orchestrator.run_triage", return_value=_make_triage("crisis", "crisis-escalation")), \
             patch("agent.orchestrator.client") as mock_client, \
             patch("agent.memory.add_message"), \
             patch("agent.memory.get_history", return_value=[]):
            result = chat("user-1", "me siento muy mal")
            mock_client.chat.completions.create.assert_not_called()
            assert result["reply"] == CRISIS_RESPONSE
            assert result["playbook_activated"] == "crisis-escalation"

    def test_crisis_contains_linea_106(self):
        from agent.orchestrator import chat
        with patch("agent.orchestrator.run_triage", return_value=_make_triage("crisis")), \
             patch("agent.orchestrator.client"), \
             patch("agent.memory.add_message"), \
             patch("agent.memory.get_history", return_value=[]):
            result = chat("user-1", "test")
            assert "106" in result["reply"]


class TestNormalFlowE2E:
    def test_non_crisis_calls_llm(self):
        from agent.orchestrator import chat
        mock_llm = _mock_llm_response("Hola, veo que tus patrones digitales son normales.")

        with patch("agent.orchestrator.run_triage", return_value=_make_triage("default")), \
             patch("agent.orchestrator.client") as mock_client, \
             patch("agent.memory.add_message"), \
             patch("agent.memory.get_history", return_value=[]):
            mock_client.chat.completions.create.return_value = mock_llm
            result = chat("user-1", "¿Cómo estoy?")
            mock_client.chat.completions.create.assert_called_once()
            assert "reply" in result

    def test_habit_marker_extracted(self):
        from agent.orchestrator import chat
        text = "Prueba este hábito.\nHÁBITO_SUGERIDO: Sin teléfono al despertar"
        mock_llm = _mock_llm_response(text)

        with patch("agent.orchestrator.run_triage", return_value=_make_triage("default")), \
             patch("agent.orchestrator.client") as mock_client, \
             patch("agent.memory.add_message"), \
             patch("agent.memory.get_history", return_value=[]):
            mock_client.chat.completions.create.return_value = mock_llm
            result = chat("user-1", "¿Qué hábito me recomiendas?")
            assert result["suggested_habit"] == "Sin teléfono al despertar"
            assert "HÁBITO_SUGERIDO:" not in result["reply"]

    def test_response_keys_present(self):
        from agent.orchestrator import chat
        mock_llm = _mock_llm_response("Respuesta sin hábito.")

        with patch("agent.orchestrator.run_triage", return_value=_make_triage("default")), \
             patch("agent.orchestrator.client") as mock_client, \
             patch("agent.memory.add_message"), \
             patch("agent.memory.get_history", return_value=[]):
            mock_client.chat.completions.create.return_value = mock_llm
            result = chat("user-1", "test")
            assert "reply" in result
            assert "playbook_activated" in result
            assert "suggested_habit" in result


class TestTriageIntegrationE2E:
    def test_triage_feeds_playbook_into_response(self):
        from agent.orchestrator import chat
        mock_llm = _mock_llm_response("Noto fragmentación de atención.")

        with patch("agent.orchestrator.run_triage", return_value=_make_triage("digital", "attention-fragmentation")), \
             patch("agent.orchestrator.client") as mock_client, \
             patch("agent.memory.add_message"), \
             patch("agent.memory.get_history", return_value=[]):
            mock_client.chat.completions.create.return_value = mock_llm
            result = chat("user-1", "¿Cómo estoy?")
            assert result["playbook_activated"] == "attention-fragmentation"
