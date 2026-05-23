-- Kairós MVP — Schema inicial
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- Extensión pgvector (para RAG del agente)
CREATE EXTENSION IF NOT EXISTS vector;

-- ── EVENTOS DE USO ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  domain text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  event_type text NOT NULL CHECK (event_type IN ('tab_active','tab_idle','scroll','notification')),
  scroll_speed float,
  source text NOT NULL DEFAULT 'extension' CHECK (source IN ('extension','android','survey')),
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON usage_events (user_id, timestamp DESC);
CREATE INDEX ON usage_events (user_id, domain);

-- ── ENCUESTAS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  survey_type text NOT NULL CHECK (survey_type IN ('phq9','gad7','ema')),
  responses jsonb NOT NULL,
  total_score float NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON survey_responses (user_id, survey_type, created_at DESC);

-- ── HÁBITOS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  playbook_slug text,
  frequency text NOT NULL DEFAULT 'daily',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id bigserial PRIMARY KEY,
  habit_id uuid REFERENCES habits ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid UNIQUE REFERENCES habits ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completion date,
  grace_days_used integer NOT NULL DEFAULT 0
);

-- ── RESULTADOS ML ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_results (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  model_type text NOT NULL,
  result jsonb NOT NULL,
  computed_at timestamptz DEFAULT now()
);
CREATE INDEX ON ml_results (user_id, model_type, computed_at DESC);

-- ── FEATURES DIARIAS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_features (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  features jsonb NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ── PLAYBOOKS RAG ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  signal_type text,
  content text NOT NULL,
  activates_when text,
  crisis_escalation boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playbook_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES playbooks ON DELETE CASCADE,
  chunk_text text NOT NULL,
  embedding vector(384),
  chunk_index integer NOT NULL
);
CREATE INDEX ON playbook_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- ── REPORTES SEMANALES ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  narrative text,
  metrics jsonb,
  created_at timestamptz DEFAULT now()
);

-- ── INTERVENCIONES ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS intervention_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_type text,
  playbook_slug text,
  shown_at timestamptz DEFAULT now(),
  acted_upon boolean DEFAULT false
);

-- ── FUNCIÓN RPC PARA RAG (usada por agent-service) ───────────────────────────
CREATE OR REPLACE FUNCTION match_playbook_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  chunk_text text,
  playbook_slug text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.chunk_text,
    p.slug AS playbook_slug,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM playbook_chunks pc
  JOIN playbooks p ON p.id = pc.playbook_id
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
