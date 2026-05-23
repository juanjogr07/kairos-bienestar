# US-API-003 — Rate limiting en la API

> ✅ **IMPLEMENTADO** — Mergeado en `dev` vía `main` (commit `59fb318`). Ver plan maestro: `docs/plans/2026-05-23-implementacion-pendiente.md`

**Asignado a:** API & Connections  
**Prioridad:** Media  
**Estimación:** 3 puntos  
**Rama:** `feature/apiconections`  
**Estado:** ✅ Mergeado en `dev`

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

- [x] `POST /api/v1/agent/chat` → máximo 20 req/hora por `user_id`
- [x] Al superar el límite: HTTP 429 con body de error en español
- [x] El límite se resetea cada hora (sliding window via slowapi)
- [ ] Los health checks (`GET /health`) no cuentan para el límite — **verificar configuración al mergear**

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

- [x] Rate limiting activo en `/chat` (slowapi en `agent-service/rate_limit.py`)
- [x] Respuesta 429 con mensaje en español
- [x] Mergeado en `dev`
- [ ] Verificar que health check `GET /health` no cuenta para el límite
