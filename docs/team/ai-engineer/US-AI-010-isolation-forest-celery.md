# US-AI-010 — Isolation Forest via Celery (Feature Extraction + Anomaly Inference)

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Alta — bloquea triage pipeline  
**Estimado:** 3h

---

## Historia

Como sistema Kairós, quiero que el Isolation Forest se entrene con datos reales de Supabase y se ejecute cada noche vía Celery, para poder detectar días atípicos de uso en cada usuario.

---

## Criterios de Aceptación

- [ ] `compute_user_features` guarda el row en `daily_features` con todos los campos
- [ ] `run_inference_for_user` lee el row, ejecuta `predict_anomaly`, persiste en `ml_results`
- [ ] El campo `result` en `ml_results` contiene `{anomaly_score, is_anomaly, risk_level, flagged_features}`
- [ ] Si el usuario tiene <30 días: usa modelo global; si ≥30 días: usa modelo personal
- [ ] El modelo personal se entrena automáticamente al cruzar umbral (Celery task `retrain_personal_model`)
- [ ] La tarea nocturna `compute_all_users` corre sin errores con 0 usuarios activos (no crash)

## Definition of Done

- Celery worker arranca sin errores: `celery -A ml_worker.celery_app worker -l info`
- `celery -A ml_worker.celery_app beat -l info` ejecuta nightly schedule
- Test manual: `from ml_worker.tasks.inference import run_inference_for_user; run_inference_for_user.apply(args=[USER_ID])`
- `ml_results` en Supabase tiene filas con `model_type="full_pipeline"`

## Archivos

- `ml-worker/models/anomaly.py` — implementado
- `ml-worker/features/extractor.py` — implementado
- `ml-worker/tasks/feature_extraction.py` — implementado
- `ml-worker/tasks/inference.py` — implementado
- `ml-worker/registry/model_store.py` — implementado
