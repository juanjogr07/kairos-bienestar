# US-AI-013 — Prophet Relapse Forecaster

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Media (Fase 2, ≥30 días datos)  
**Estimado:** 2h

---

## Historia

Como agente, quiero predecir la tendencia de uso digital en los próximos 7 días para anticipar semanas de alto riesgo y enviar alertas preventivas antes de que el usuario caiga en un patrón negativo.

---

## Criterios de Aceptación

- [ ] `predict_forecast(user_id)` devuelve `{forecast_7d, trend_direction, relapse_risk_score}`
- [ ] Sin modelo (< 30 días datos): devuelve `{forecast_7d: [0]*7, trend_direction: "unknown", ...}`
- [ ] `trend_direction` correcto: "increasing" cuando segunda mitad del forecast > primera mitad en 5%
- [ ] `relapse_risk_score` > 0 solo cuando `pct_change > 0.2`
- [ ] `train_prophet` guarda modelo en `prophet_total_usage_min_{user_id}.joblib`

## Definition of Done

- Con 45 días de datos sintéticos: modelo se entrena y genera forecast
- `retrain_personal_model` tarea incluye Prophet en su pipeline
- No crash con < 30 días datos

## Archivos

- `ml-worker/models/timeseries.py` — implementado
- `ml-worker/tasks/training.py` — llama a `train_prophet` en `retrain_personal_model`
