# US-DATA-002 — Índices de performance en Supabase

**Asignado a:** Backend 2 (Data)  
**Prioridad:** Media  
**Estimación:** 2 puntos  
**Rama:** `mig/002-performance-indices`

---

## Historia de usuario

> Como sistema, quiero que las queries más frecuentes a Supabase respondan en < 200ms, para que el dashboard y el agente sean fluidos incluso con miles de eventos.

---

## Contexto técnico

Las queries más costosas son:
1. Dashboard: `SELECT ... FROM usage_events WHERE user_id = ? AND timestamp >= ?`
2. Agent tool: `SELECT ... FROM survey_responses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
3. ML features: `SELECT ... FROM usage_events WHERE user_id = ? AND timestamp >= ?`

Sin índices en `user_id + timestamp`, estas queries hacen full table scan.

---

## Archivos a crear

| Archivo | Acción |
|---|---|
| `infra/supabase/migrations/002_performance_indices.sql` | Crear migración |

**NO tocar:** ningún archivo de código — solo SQL.

---

## SQL de la migración

```sql
-- 002_performance_indices.sql
-- Performance indexes para queries frecuentes de Kairós

-- usage_events: queries por usuario + rango de tiempo (dashboard, ML features)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_events_user_timestamp
  ON usage_events (user_id, timestamp DESC);

-- usage_events: queries por domain (top dominios)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_events_user_domain
  ON usage_events (user_id, domain);

-- survey_responses: último score por tipo (triage, agente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_survey_responses_user_type_date
  ON survey_responses (user_id, survey_type, created_at DESC);

-- ml_results: último resultado por modelo (agente)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_results_user_model_date
  ON ml_results (user_id, model_type, computed_at DESC);

-- habit_completions: completados hoy (dashboard)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habit_completions_user_date
  ON habit_completions (user_id, completed_at DESC);

-- Rollback:
-- DROP INDEX IF EXISTS idx_usage_events_user_timestamp;
-- DROP INDEX IF EXISTS idx_usage_events_user_domain;
-- DROP INDEX IF EXISTS idx_survey_responses_user_type_date;
-- DROP INDEX IF EXISTS idx_ml_results_user_model_date;
-- DROP INDEX IF EXISTS idx_habit_completions_user_date;
```

---

## Criterios de aceptación

- [ ] Migración aplicada sin errores en Supabase
- [ ] Query del dashboard (`usage_events` por `user_id + timestamp`) usa el índice (verificar con EXPLAIN ANALYZE)
- [ ] `CONCURRENTLY` usado para no bloquear la tabla durante la creación
- [ ] SQL de rollback incluido en comentarios

---

## Cómo aplicar

```bash
# Via Supabase MCP o Dashboard → SQL Editor
# Copiar contenido de infra/supabase/migrations/002_performance_indices.sql
```

---

## Definition of Done

- [ ] Archivo SQL creado en `infra/supabase/migrations/`
- [ ] Migración aplicada en el proyecto Supabase
- [ ] PR → `dev` con confirmación de aplicación
- [ ] Notificar al equipo antes de aplicar (puede haber lock breve en tablas)
