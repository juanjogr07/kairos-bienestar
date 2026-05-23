# US-DATA-005 — Tabla ml_results en Supabase

**Owner:** Emanuel  
**Rama:** `mig/005-ml-results-table`  
**Prioridad:** Alta — bloquea inferencia pipeline  
**Estimado:** 2h

---

## Historia

Como ML Worker, necesito una tabla `ml_results` donde guardar los outputs de todos los modelos (anomaly, triage, cluster) como JSONB, para que el agente y el frontend los puedan consultar.

---

## Criterios de Aceptación

- [ ] Tabla `ml_results` con `(user_id, date, model_type)` como PK
- [ ] Campo `result` JSONB almacena el output completo del pipeline
- [ ] RLS: usuario lee sus propios resultados; service_role escribe
- [ ] `upsert` por `(user_id, date, model_type)` funciona

## Schema

```sql
CREATE TABLE ml_results (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  model_type  text NOT NULL DEFAULT 'full_pipeline',
  result      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, date, model_type)
);

CREATE INDEX idx_ml_results_user_date ON ml_results(user_id, date DESC);

ALTER TABLE ml_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_ml_results"
  ON ml_results FOR SELECT
  USING (auth.uid() = user_id);
```

## Estructura esperada del campo `result`

```json
{
  "anomaly": {
    "anomaly_score": 0.33,
    "is_anomaly": false,
    "risk_level": "low",
    "flagged_features": []
  },
  "triage": {
    "attention_fragmentation": 0.42,
    "nocturnal_pattern": 0.71,
    "doomscrolling": 0.55,
    "low_mood_indicator": 0.30,
    "anxiety_indicator": 0.28,
    "model": "xgboost_global"
  },
  "cluster": {
    "cluster_label": 1,
    "cluster_name": "moderate",
    "profile_features": {}
  },
  "computed_at": "2026-05-23T02:05:00Z"
}
```

## Definition of Done

- Migración aplicada y `supabase db push` exitoso
- `GET /api/v1/dashboard` puede hacer JOIN con `ml_results`
- `run_inference_for_user` upserta correctamente

## Archivos

- `infra/supabase/migrations/20260523000005_ml_results.sql` — crear
