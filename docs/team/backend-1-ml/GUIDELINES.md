# Lineamientos — Backend 1 (ML Worker)

## Tu dominio exclusivo

```
ml-worker/               ← servicio Celery (crear si no existe)
api-service/services/ml/ ← lógica de ML (feature engineering, inferencia)
agent-service/ml/        ← integración ML → agente
data/                    ← datasets de entrenamiento, modelos serializados
```

**NUNCA toques sin coordinación:**
- `api-service/routers/` → API-Connections
- `agent-service/agent/` → AI-Engineer
- `infra/supabase/migrations/` → Backend-2-Data (pero sí puedes proponer migraciones nuevas)
- `web/` → Frontend

---

## Estrategia de ramas

```
main           ← producción
dev            ← integración
feat/ml/<id>   ← features
fix/ml/<id>    ← bugfixes
exp/ml/<id>    ← experimentos (nunca van a main directamente)
```

```bash
git checkout dev && git pull origin dev
git checkout -b feat/ml/US-ML-001-isolation-forest
```

**Regla especial para experimentos:** Las ramas `exp/` nunca se mergean directo a `dev`. Primero se convierte en `feat/` cuando el experimento es exitoso.

---

## Commits

```
feat(ml): implementar Isolation Forest para detección de anomalías
feat(features): calcular nocturnal_ratio desde usage_events
fix(ml): corregir normalización de scroll_speed en feature pipeline
test(ml): agregar test de regresión para xgboost_mood con datos seed
```

---

## Contrato de salida del ML

Los resultados ML se guardan en la tabla `ml_results` y los lee el AI-Engineer desde `agent-service/agent/tools/get_ml_scores.py`. El schema que debes respetar:

```python
# Tabla ml_results — columna result (jsonb)

# isolation_forest
{
    "anomaly_score": float,      # negativo = más anómalo
    "is_anomaly": bool,
    "risk_level": "low" | "medium" | "high",
    "flagged_features": list[str]
}

# xgboost_mood
{
    "predicted_phq9_change": float,
    "direction": "increase" | "decrease" | "stable",
    "confidence": float,          # 0-1
    "risk_window_days": int
}

# kmeans_cluster (Fase 2)
{
    "cluster": int,
    "profile": str,
    "confidence": float,
    "description": str
}
```

**Si añades un nuevo model_type**, notifica a AI-Engineer para que actualice `get_ml_scores.py`.

---

## Cómo evitar conflictos

1. **Modelos serializados** (`.pkl`, `.joblib`): van en `data/models/` y se ignoran en `.gitignore`. Solo sube el código de entrenamiento, no el binario
2. **Feature engineering** depende de la tabla `usage_events` — coordina con Backend-2-Data si necesitas columnas nuevas
3. **Variables de entorno nuevas** (Redis URL para Celery, etc.): actualiza `.env.example`

---

## Tests obligatorios

```bash
# Cada pipeline ML debe tener test con datos seed
# Usar los datos de infra/supabase/seeds/002_seed_demo_user.sql como referencia

pytest ml-worker/tests/ -v
```

Los tests de ML no deben requerir GPU ni datasets grandes — usa muestras sintéticas de 50-100 filas.
