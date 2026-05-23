# US-DATA-004 — Tabla daily_features en Supabase

**Owner:** Emanuel  
**Rama:** `mig/004-daily-features-table`  
**Prioridad:** Alta — bloquea todo el pipeline ML  
**Estimado:** 2h

---

## Historia

Como ML Worker, necesito una tabla `daily_features` en Supabase donde guardar los features conductuales diarios calculados por el extractor, para que los modelos ML puedan leer datos de entrenamiento e inferencia.

---

## Criterios de Aceptación

- [ ] Tabla `daily_features` creada con migración en `infra/supabase/migrations/`
- [ ] Primary key: `(user_id, date)` — un row por usuario por día
- [ ] RLS habilitado: usuario solo lee sus propios rows; `service_role` escribe
- [ ] Índices en `user_id` y `date`
- [ ] `upsert` por `(user_id, date)` no falla si el row ya existe

## Schema

```sql
CREATE TABLE daily_features (
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date              date NOT NULL,
  total_usage_min   numeric DEFAULT 0,
  nocturnal_min     numeric DEFAULT 0,
  nocturnal_ratio   numeric DEFAULT 0,
  social_ratio      numeric DEFAULT 0,
  productive_ratio  numeric DEFAULT 0,
  avg_scroll_speed  numeric DEFAULT 0,
  session_count     integer DEFAULT 0,
  max_session_min   numeric DEFAULT 0,
  app_switches_per_hour numeric DEFAULT 0,
  app_switches      integer DEFAULT 0,
  scroll_distance_km numeric DEFAULT 0,
  notification_count integer DEFAULT 0,
  phq9_score        numeric DEFAULT 0,
  gad7_score        numeric DEFAULT 0,
  anomaly_score     numeric DEFAULT 0,
  streak_adherence_rate numeric DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX idx_daily_features_user_date ON daily_features(user_id, date DESC);

ALTER TABLE daily_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_features"
  ON daily_features FOR SELECT
  USING (auth.uid() = user_id);
```

## Definition of Done

- Migración aplicada en Supabase (local + producción)
- `supabase db push` exitoso
- `upsert_daily_features({"user_id": UUID, "date": "2026-05-23", "total_usage_min": 120})` funciona desde ml-worker

## Archivos

- `infra/supabase/migrations/20260523000004_daily_features.sql` — crear
