"""Tests para US-API-003: rate limiting en POST /api/v1/agent/chat.

Criterios cubiertos:
- `/chat` → máximo 20 req/hora **por user_id** (no por IP)
- Al superar el límite: HTTP 429 con body en español y minutos restantes
- `/health` excluido del límite
- Dos usuarios distintos NO comparten cubo aunque vengan de la misma IP
- Header `Retry-After` presente en respuesta 429
"""

from __future__ import annotations

import base64
import importlib
import json
import sys
import types
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


def _make_jwt(sub: str) -> str:
    """Construye un JWT *sin firmar* (firma vacía) — suficiente para el
    rate-limiter porque éste solo decodifica el payload sin verificar.
    El `auth.get_current_user` real se mockea aparte.
    """
    header = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b"=").decode()
    payload = (
        base64.urlsafe_b64encode(json.dumps({"sub": sub}).encode()).rstrip(b"=").decode()
    )
    return f"{header}.{payload}."


@pytest.fixture
def client():
    """App con dependencias pesadas stubeadas y limiter reinicializado."""
    agent_pkg = types.ModuleType("agent")
    sys.modules["agent"] = agent_pkg

    orchestrator_mod = types.ModuleType("agent.orchestrator")
    orchestrator_mod.chat = lambda user_id, message: {
        "reply": "ok",
        "playbook_activated": None,
        "suggested_habit": None,
    }
    sys.modules["agent.orchestrator"] = orchestrator_mod

    memory_mod = types.ModuleType("agent.memory")
    memory_mod.get_history = lambda user_id: []
    sys.modules["agent.memory"] = memory_mod

    # Recargar rate_limit + main para que el contador in-memory de slowapi
    # arranque limpio en cada test
    import rate_limit
    importlib.reload(rate_limit)
    import main as main_mod
    importlib.reload(main_mod)

    mock_db = MagicMock()

    def _make_user(token: str) -> MagicMock:
        # El "user_id" devuelto por get_current_user coincide con el sub del JWT
        parts = token.split(".")
        payload = json.loads(
            base64.urlsafe_b64decode(parts[1] + "=" * (-len(parts[1]) % 4))
        )
        return MagicMock(user=MagicMock(id=payload.get("sub", "anon")))

    mock_db.auth.get_user.side_effect = _make_user

    with patch("auth.supabase", mock_db):
        yield TestClient(main_mod.app)


def test_chat_allows_20_then_blocks_with_429(client):
    """Los primeros 20 requests del mismo user pasan, el 21 retorna 429."""
    token = _make_jwt("user-A")
    headers = {"Authorization": f"Bearer {token}"}

    for i in range(20):
        r = client.post("/api/v1/agent/chat", json={"message": "hola"}, headers=headers)
        assert r.status_code == 200, f"Request #{i + 1} debió ser 200, fue {r.status_code}"

    r = client.post("/api/v1/agent/chat", json={"message": "hola"}, headers=headers)
    assert r.status_code == 429


def test_429_body_is_spanish_with_dynamic_minutes(client):
    """El body debe ser español y mencionar minutos restantes."""
    token = _make_jwt("user-B")
    headers = {"Authorization": f"Bearer {token}"}

    for _ in range(20):
        client.post("/api/v1/agent/chat", json={"message": "x"}, headers=headers)

    r = client.post("/api/v1/agent/chat", json={"message": "x"}, headers=headers)
    assert r.status_code == 429
    body = r.json()
    assert "error" in body
    assert "Límite de conversaciones alcanzado" in body["error"]
    assert "minutos" in body["error"]
    # El header Retry-After debe estar presente y ser un entero positivo
    assert "Retry-After" in r.headers
    assert int(r.headers["Retry-After"]) > 0


def test_health_endpoint_not_rate_limited(client):
    """`/health` puede invocarse ilimitadamente, incluso tras un 429."""
    token = _make_jwt("user-C")
    headers = {"Authorization": f"Bearer {token}"}

    for _ in range(20):
        client.post("/api/v1/agent/chat", json={"message": "x"}, headers=headers)

    r_blocked = client.post("/api/v1/agent/chat", json={"message": "x"}, headers=headers)
    assert r_blocked.status_code == 429

    for _ in range(30):
        assert client.get("/health").status_code == 200


def test_rate_limit_is_per_user_not_per_ip(client):
    """Dos usuarios distintos (misma IP) NO comparten cubo."""
    token_a = _make_jwt("user-D")
    token_b = _make_jwt("user-E")

    for _ in range(20):
        r = client.post(
            "/api/v1/agent/chat",
            json={"message": "x"},
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert r.status_code == 200

    r_a = client.post(
        "/api/v1/agent/chat",
        json={"message": "x"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert r_a.status_code == 429

    # user-E aún tiene su cubo intacto pese a compartir IP con user-D
    r_b = client.post(
        "/api/v1/agent/chat",
        json={"message": "x"},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert r_b.status_code == 200, (
        f"user-E debió obtener 200 (cubo independiente), obtuvo {r_b.status_code}"
    )
