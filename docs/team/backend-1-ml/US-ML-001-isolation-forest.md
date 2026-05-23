# US-ML-001 — Pipeline de Isolation Forest para detección de anomalías

**Asignado a:** Backend 1 (ML Worker)  
**Prioridad:** Alta  
**Estimación:** 5 puntos  
**Rama:** `feat/ml/US-ML-001-isolation-forest`

---

## Historia de usuario

> Como sistema, quiero que un modelo de Isolation Forest analice el uso digital del usuario cada 24 horas y guarde el resultado en `ml_results`, para que el agente pueda detectar días anómalos y alertar al usuario.

---

## Contexto técnico

Ya existe un resultado pre-calculado en la tabla `ml_results` con `model_type = "isolation_forest"`. Esta historia crea el pipeline real que lo genera desde los datos de `usage_events`.

**Contrato de salida que debes respetar** (AI-Engineer lo lee):
```python
{
    "anomaly_score": float,      # sklearn: decision_function score
    "is_anomaly": bool,          # True si score < umbral
    "risk_level": "low" | "medium" | "high",
    "flagged_features": list[str]  # features que más contribuyeron
}
```

---

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `api-service/services/ml/features.py` | Feature engineering desde usage_events |
| `api-service/services/ml/isolation_forest.py` | Entrenamiento e inferencia |
| `api-service/services/ml/runner.py` | Orquestador diario |
| `data/models/` | Directorio para modelos serializados (en .gitignore) |
| `api-service/tests/test_isolation_forest.py` | Tests con datos sintéticos |

**NO tocar:** `agent-service/`, `web/`, `infra/` sin coordinar

---

## Features de entrada

Extraídos de `usage_events` de los últimos 7 días por usuario:

```python
features = {
    "total_minutes": float,          # minutos totales
    "nocturnal_ratio": float,        # % uso entre 22h-6h
    "social_ratio": float,           # % en redes sociales
    "avg_scroll_speed": float,       # promedio de scroll_speed
    "session_count": int,            # número de sesiones
    "max_session_minutes": float,    # sesión más larga
    "productive_ratio": float,       # % en docs/email/work
}
```

---

## Criterios de aceptación

- [ ] `features.py` extrae los 7 features desde la tabla `usage_events`
- [ ] `isolation_forest.py` entrena con datos globales (todos los usuarios) si hay ≥ 50 registros
- [ ] Si hay < 50 registros, usa un modelo pre-entrenado con datos sintéticos (incluirlo en el repo)
- [ ] Resultado guardado en `ml_results` con `model_type = "isolation_forest"`
- [ ] Upsert (no duplicar si ya existe para el mismo `user_id` y día)
- [ ] Test con DataFrame sintético de 10 filas sin necesidad de DB

---

## Implementación sugerida

```python
# api-service/services/ml/isolation_forest.py
from sklearn.ensemble import IsolationForest
import numpy as np

CONTAMINATION = 0.1  # ~10% de usuarios son "anómalos"

def score_user(features: dict) -> dict:
    X = np.array([[
        features["total_minutes"],
        features["nocturnal_ratio"],
        features["social_ratio"],
        features["avg_scroll_speed"],
        features["session_count"],
        features["max_session_minutes"],
        features["productive_ratio"],
    ]])
    
    model = _load_or_train_model()
    score = float(model.decision_function(X)[0])
    is_anomaly = score < -0.1
    
    risk_level = "high" if score < -0.3 else "medium" if score < -0.1 else "low"
    
    flagged = []
    if features["nocturnal_ratio"] > 0.4: flagged.append("nocturnal_ratio")
    if features["avg_scroll_speed"] > 800: flagged.append("scroll_speed_avg")
    
    return {
        "anomaly_score": score,
        "is_anomaly": is_anomaly,
        "risk_level": risk_level,
        "flagged_features": flagged,
    }
```

---

## Definition of Done

- [ ] Pipeline funcional con datos reales de Supabase
- [ ] Tests unitarios con datos sintéticos (no requieren DB)
- [ ] Upsert en `ml_results` funciona sin duplicar
- [ ] PR → `dev`
- [ ] Notificar a AI-Engineer cuando esté en `dev` para validar que `get_ml_scores` lee correctamente
