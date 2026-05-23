# US-AI-014 — Behavioral-Mood Correlation Engine

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Media (Fase 2)  
**Estimado:** 2h

---

## Historia

Como agente, quiero saber qué comportamientos digitales específicos correlacionan con el estado de ánimo bajo en ESTE usuario, para generar insights personalizados ("cuando usas redes sociales de noche, tu PHQ-9 tiende a subir").

---

## Criterios de Aceptación

- [ ] `compute_correlations(df, user_id)` calcula Pearson + Spearman para cada feature vs PHQ-9/GAD-7
- [ ] Requiere mínimo `CORRELATION_MIN_SURVEYS=4` filas con scores de encuesta
- [ ] `top_predictors` lista features con |r| > 0.3 y p < 0.05
- [ ] Resultados persisten en `saved_models/corr_{user_id}.json`
- [ ] `get_top_predictors(user_id)` devuelve lista vacía cuando no hay datos suficientes (no crash)

## Definition of Done

- Con 10 filas de datos sintéticos con PHQ-9: `compute_correlations` devuelve top_predictors
- El JSON se guarda en MODELS_DIR
- Se llama desde `check_personalization_eligibility` task cuando hay suficientes surveys

## Archivos

- `ml-worker/models/correlation.py` — implementado
