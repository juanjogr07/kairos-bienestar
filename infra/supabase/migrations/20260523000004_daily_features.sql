-- Migration: daily_features table
-- Owner: Emanuel (Backend Data)
-- Needed by: ml-worker feature extractor

CREATE TABLE IF NOT EXISTS daily_features (
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                    date NOT NULL,
  total_usage_min         numeric DEFAULT 0,
  nocturnal_min           numeric DEFAULT 0,
  nocturnal_ratio         numeric DEFAULT 0,
  social_ratio            numeric DEFAULT 0,
  productive_ratio        numeric DEFAULT 0,
  avg_scroll_speed        numeric DEFAULT 0,
  session_count           integer DEFAULT 0,
  max_session_min         numeric DEFAULT 0,
  app_switches_per_hour   numeric DEFAULT 0,
  app_switches            integer DEFAULT 0,
  scroll_distance_km      numeric DEFAULT 0,
  notification_count      integer DEFAULT 0,
  phq9_score              numeric DEFAULT 0,
  gad7_score              numeric DEFAULT 0,
  anomaly_score           numeric DEFAULT 0,
  streak_adherence_rate   numeric DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_features_user_date
  ON daily_features (user_id, date DESC);

ALTER TABLE daily_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_features"
  ON daily_features FOR SELECT
  USING (auth.uid() = user_id);

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION update_daily_features_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_features_updated_at ON daily_features;
CREATE TRIGGER trg_daily_features_updated_at
  BEFORE UPDATE ON daily_features
  FOR EACH ROW EXECUTE FUNCTION update_daily_features_updated_at();
