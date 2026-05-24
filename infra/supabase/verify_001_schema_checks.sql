-- verify_001_schema_checks.sql
-- Ejecutar en Supabase SQL Editor despues de aplicar:
-- 1) infra/supabase/migrations/001_initial_schema.sql
-- 2) (opcional) infra/supabase/migrations/002_performance_indices.sql

-- ---------------------------------------------------------------------------
-- 0) Verificar extension pgvector
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'vector'
  ) THEN
    RAISE EXCEPTION 'FAIL: extension "vector" no encontrada.';
  END IF;

  RAISE NOTICE 'PASS: extension "vector" instalada.';
END $$;

-- ---------------------------------------------------------------------------
-- 1) Verificar tablas base requeridas
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  missing_tables text;
BEGIN
  WITH expected(name) AS (
    VALUES
      ('usage_events'),
      ('survey_responses'),
      ('habits'),
      ('streaks'),
      ('ml_results'),
      ('playbooks'),
      ('playbook_chunks'),
      ('notifications')
  )
  SELECT string_agg(e.name, ', ')
  INTO missing_tables
  FROM expected e
  LEFT JOIN information_schema.tables t
    ON t.table_schema = 'public'
   AND t.table_name = e.name
  WHERE t.table_name IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: faltan tablas en schema public: %', missing_tables;
  END IF;

  RAISE NOTICE 'PASS: tablas requeridas presentes.';
END $$;

-- ---------------------------------------------------------------------------
-- 2) Verificar indice ivfflat en playbook_chunks
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'playbook_chunks'
      AND indexdef ILIKE '%USING ivfflat%'
      AND indexdef ILIKE '%embedding%'
  ) THEN
    RAISE EXCEPTION 'FAIL: no existe indice ivfflat sobre playbook_chunks.embedding.';
  END IF;

  RAISE NOTICE 'PASS: indice ivfflat en playbook_chunks.embedding encontrado.';
END $$;

-- ---------------------------------------------------------------------------
-- 3) Verificar indices en usage_events
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'usage_events'
      AND (
        indexdef ILIKE '%(user_id, timestamp DESC)%'
        OR indexname = 'idx_usage_events_user_timestamp'
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: falta indice usage_events(user_id, timestamp DESC).';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'usage_events'
      AND (
        indexdef ILIKE '%(user_id, domain)%'
        OR indexname = 'idx_usage_events_user_domain'
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: falta indice usage_events(user_id, domain).';
  END IF;

  RAISE NOTICE 'PASS: indices de usage_events verificados.';
END $$;

-- ---------------------------------------------------------------------------
-- 4) Verificar indice en survey_responses
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'survey_responses'
      AND (
        indexdef ILIKE '%(user_id, survey_type, created_at DESC)%'
        OR indexname = 'idx_survey_responses_user_type_date'
      )
  ) THEN
    RAISE EXCEPTION 'FAIL: falta indice survey_responses(user_id, survey_type, created_at DESC).';
  END IF;

  RAISE NOTICE 'PASS: indice de survey_responses verificado.';
END $$;

-- ---------------------------------------------------------------------------
-- 5) Verificar indices en notifications (migration 003)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND indexname = 'idx_notifications_user_unread'
  ) THEN
    RAISE EXCEPTION 'FAIL: falta indice idx_notifications_user_unread.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND indexname = 'idx_notifications_one_per_type_per_day'
  ) THEN
    RAISE EXCEPTION 'FAIL: falta indice unico idx_notifications_one_per_type_per_day.';
  END IF;

  RAISE NOTICE 'PASS: indices de notifications verificados.';
END $$;

-- ---------------------------------------------------------------------------
-- 6) Verificar funcion RPC de RAG
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'match_playbook_chunks'
  ) THEN
    RAISE EXCEPTION 'FAIL: funcion match_playbook_chunks no existe.';
  END IF;

  RAISE NOTICE 'PASS: funcion match_playbook_chunks existe.';
END $$;

-- ---------------------------------------------------------------------------
-- 7) Resumen visible de tablas e indices (consulta informativa)
-- ---------------------------------------------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'usage_events',
    'survey_responses',
    'habits',
    'streaks',
    'ml_results',
    'playbooks',
    'playbook_chunks',
    'notifications'
  )
ORDER BY table_name;

SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('usage_events', 'survey_responses', 'notifications')
    OR (tablename = 'playbook_chunks' AND indexdef ILIKE '%ivfflat%')
  )
ORDER BY tablename, indexname;
