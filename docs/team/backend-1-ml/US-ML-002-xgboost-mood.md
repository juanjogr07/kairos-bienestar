# US-ML-002 — XGBoost predictor de cambio de ánimo

**Asignado a:** Backend 1 (ML Worker)  
**Prioridad:** Media  
**Estimación:** 5 puntos  
**Rama:** `feat/ml/US-ML-002-xgboost-mood`  
**Depende de:** US-ML-001 (features.py debe estar listo)

---

## Historia de usuario

> Como sistema, quiero un modelo XGBoost que prediga si el score PHQ-9 del usuario subirá o bajará en los próximos 7 días basándose en su comportamiento digital, para que el agente pueda anticiparse y actuar preventivamente.

---

## Contrato de salida

```python
{
    "predicted_phq9_change": float,   # cambio esperado en puntos
    "direction": "increase" | "decrease" | "stable",
    "confidence": float,              # 0-1
    "risk_window_days": int           # siempre 7
}
```

---

## Archivos a crear

| Archivo | Acción |
|---|---|
| `api-service/services/ml/xgboost_mood.py` | Modelo y predicción |
| `data/synthetic/mood_training.csv` | Dataset sintético de entrenamiento (300 filas) |
| `api-service/tests/test_xgboost_mood.py` | Tests |

**Reutiliza** `api-service/services/ml/features.py` de US-ML-001.

---

## Dataset sintético

Dado que no tenemos datos reales suficientes al inicio, crear `data/synthetic/mood_training.csv` con 300 filas sintéticas:

| columna | descripción |
|---|---|
| `total_minutes` | 30-600 |
| `nocturnal_ratio` | 0-1 |
| `social_ratio` | 0-1 |
| `avg_scroll_speed` | 100-1500 |
| `phq9_current` | 0-27 |
| `phq9_delta_7d` | cambio real (target: -5 a +5) |

Reglas del dataset sintético (para que el modelo aprenda algo sensato):
- `nocturnal_ratio > 0.4` + `social_ratio > 0.6` → `phq9_delta` positivo (+1 a +3)
- `productive_ratio > 0.5` + `total_minutes < 120` → `phq9_delta` negativo (-1 a -2)

---

## Criterios de aceptación

- [ ] Modelo entrenado con el dataset sintético
- [ ] `predict_mood_change(features: dict) -> dict` retorna el contrato correcto
- [ ] Si `|predicted_phq9_change| < 1`, `direction = "stable"`
- [ ] Modelo serializado en `data/models/xgboost_mood.joblib` (en .gitignore, pero incluir script de entrenamiento)
- [ ] Test con 5 casos de entrada verificando direction correcta

---

## Definition of Done

- [ ] Predictor funcional
- [ ] Script de entrenamiento reproducible (`python data/train_xgboost.py`)
- [ ] Tests pasando sin DB
- [ ] PR → `dev`
