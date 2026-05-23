# US-AI-011 — XGBoost Triage Scorer (5 señales)

**Owner:** Juan Gomez  
**Rama:** `feat/ml/core/US-ML-003-full-ml-cv-stack`  
**Prioridad:** Alta — es el modelo más importante del MVP  
**Estimado:** 3h

---

## Historia

Como agente de Kairós, quiero recibir 5 señales de triaje (`attention_fragmentation`, `nocturnal_pattern`, `doomscrolling`, `low_mood_indicator`, `anxiety_indicator`) calculadas por XGBoost para personalizar mis intervenciones.

---

## Criterios de Aceptación

- [ ] `predict_triage_scores(row)` devuelve los 5 scores float [0,1] + `"model"` key
- [ ] Sin modelo entrenado: fallback a `_rule_based_triage` (nunca crash)
- [ ] Con modelo global entrenado: `"model": "xgboost_global"`
- [ ] Con modelo personal: `"model": "xgboost_personal"`
- [ ] Soft labels derivados correctamente cuando no hay anotaciones humanas
- [ ] Los scores se persisten en `ml_results.result.triage` cada noche

## Tests a implementar

```python
# tests/test_scoring.py
def test_rule_based_no_crash():
    row = {"phq9_score": 12, "gad7_score": 8, "session_count": 20}
    result = predict_triage_scores(row)
    assert "low_mood_indicator" in result
    assert 0 <= result["low_mood_indicator"] <= 1

def test_trained_model_output_shape():
    # Requires cold_start to have run
    scores = predict_triage_scores(SAMPLE_ROW)
    assert len([k for k in scores if k != "model"]) == 5
```

## Definition of Done

- `python -m ml_worker.utils.train_all` corre sin errores (entrena XGBoost)
- Inference test en test_row pasa
- No se almacenan `.joblib` en git (están en `.gitignore`)

## Archivos

- `ml-worker/models/scoring.py` — implementado
- `ml-worker/pipelines/cold_start.py` — implementado
- `ml-worker/utils/train_all.py` — implementado
