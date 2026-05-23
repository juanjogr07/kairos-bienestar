# US-API-006 — Endpoint para Disparar Inferencia ML Manual

**Owner:** Salome  
**Rama:** `feat/api/feature/US-API-006-ml-trigger`  
**Prioridad:** Media  
**Estimado:** 2h

---

## Historia

Como desarrollador/QA, necesito poder disparar manualmente el pipeline de features + inferencia ML para un usuario específico, sin esperar al cron nocturno.

---

## Criterios de Aceptación

- [ ] `POST /api/v1/ml/run` dispara Celery tasks para el usuario autenticado
- [ ] Body opcional: `{"date": "2026-05-23"}` (default: ayer)
- [ ] Responde inmediatamente con `{task_id, status: "queued"}`
- [ ] Requiere JWT válido
- [ ] Celery task ID se puede usar para polling: `GET /api/v1/ml/status/{task_id}`

## Contrato

```json
// POST /api/v1/ml/run
// Body: {} o {"date": "2026-05-23"}
// Response 202:
{
  "task_id": "abc-123-def",
  "status": "queued",
  "date": "2026-05-23",
  "message": "ML pipeline triggered for 2026-05-23"
}

// GET /api/v1/ml/status/{task_id}
// Response:
{
  "task_id": "abc-123-def",
  "status": "SUCCESS" | "PENDING" | "FAILURE",
  "result": { ... }
}
```

## Implementación

```python
from ml_worker.tasks.feature_extraction import compute_user_features
from ml_worker.tasks.inference import run_inference_for_user
from celery import chain

@router.post("/ml/run", status_code=202)
async def trigger_ml(body: MLRunRequest, user=Depends(get_current_user)):
    pipeline = chain(
        compute_user_features.s(user.id, body.date),
        run_inference_for_user.s(user.id, body.date)
    )
    task = pipeline.apply_async()
    return {"task_id": task.id, "status": "queued", ...}
```

## Definition of Done

- `POST /api/v1/ml/run` devuelve 202 con task_id
- `GET /api/v1/ml/status/{task_id}` refleja el estado real de Celery
- Sin Redis corriendo: endpoint responde 503 con mensaje claro

## Archivos

- `api-service/routers/ml.py` — crear
- `api-service/main.py` — registrar router
