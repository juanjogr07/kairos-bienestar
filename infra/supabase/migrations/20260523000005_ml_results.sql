-- Migration: ml_results table
-- Owner: Emanuel (Backend Data)
-- Needed by: ml-worker inference tasks + agent triage

CREATE TABLE IF NOT EXISTS ml_results (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  model_type  text NOT NULL DEFAULT 'full_pipeline',
  result      jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date, model_type)
);

CREATE INDEX IF NOT EXISTS idx_ml_results_user_date
  ON ml_results (user_id, date DESC);

-- GIN index for fast JSONB queries on triage scores
CREATE INDEX IF NOT EXISTS idx_ml_results_result_gin
  ON ml_results USING GIN (result);

ALTER TABLE ml_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_ml_results"
  ON ml_results FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_ml_results_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ml_results_updated_at ON ml_results;
CREATE TRIGGER trg_ml_results_updated_at
  BEFORE UPDATE ON ml_results
  FOR EACH ROW EXECUTE FUNCTION update_ml_results_updated_at();
