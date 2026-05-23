# US-API-003 — Rate limiting en la API

**Asignado a:** API & Connections  
**Prioridad:** Media  
**Estimación:** 3 puntos  
**Rama:** `feat/api/US-API-003-rate-limiting`

---

## Historia de usuario

> Como responsable de infraestructura, quiero limitar las llamadas a la API del agente a máximo 20 por usuario por hora, para proteger los costos de OpenRouter y evitar abusos.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `agent-service/main.py` | Agregar middleware de rate limit |
| `agent-service/requirements.txt` | Agregar `slowapi` |
| `agent-service/routers/chat.py` | Decorar endpoint con límite |

**NO tocar:** `agent-service/agent/`, `web/`

---

## Criterios de aceptación

- [ ] `POST /api/v1/agent/chat` → máximo 20 req/hora por `user_id`
- [ ] Al superar el límite: HTTP 429 con body `{"error": "Límite de conversaciones alcanzado. Vuelve en X minutos."}`
- [ ] El límite se resetea cada hora (sliding window)
- [ ] Los health checks (`GET /health`) no cuentan para el límite

---

## Implementación con slowapi

```bash
# requirements.txt
slowapi==0.1.9
```

```python
# agent-service/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

```python
# agent-service/routers/chat.py
from slowapi import Limiter
from slowapi.util import get_remote_address

@router.post("/chat", response_model=ChatResponse)
@limiter.limit("20/hour")
async def chat_endpoint(request: Request, body: ChatRequest, user_id: str = Depends(get_current_user)):
    result = agent_chat(user_id=user_id, message=body.message)
    return ChatResponse(**result)
```

---

## Definition of Done

- [ ] Rate limiting activo en `/chat`
- [ ] Respuesta 429 con mensaje en español
- [ ] Health check excluido
- [ ] PR → `dev`
