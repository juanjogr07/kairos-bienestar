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
