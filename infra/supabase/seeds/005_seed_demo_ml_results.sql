-- 005_seed_demo_ml_results.sql
-- Seed incremental: ml_results pre-calculados (isolation_forest + xgboost_mood).
-- Reemplaza DEMO_USER_UUID con el UUID real de Supabase Auth.
-- Requiere schema ml_results con columnas: user_id, date, model_type, result.

-- Validar que el UUID existe antes de continuar (falla ruidosamente si no)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'DEMO_USER_UUID') THEN
    RAISE EXCEPTION 'DEMO_USER_UUID no encontrado en auth.users — ejecutar create_demo_auth_user primero.';
  END IF;
END $$;

-- Limpieza idempotente para hoy en los modelos usados en demo.
DELETE FROM ml_results
WHERE user_id = 'DEMO_USER_UUID'
  AND date = CURRENT_DATE
  AND model_type IN ('isolation_forest', 'xgboost_mood');

INSERT INTO ml_results (user_id, date, model_type, result)
VALUES
  (
    'DEMO_USER_UUID',
    CURRENT_DATE,
    'isolation_forest',
    '{"anomaly_score": -0.31, "is_anomaly": true, "risk_level": "medium", "flagged_features": ["nocturnal_ratio", "scroll_speed_avg"]}'::jsonb
  ),
  (
    'DEMO_USER_UUID',
    CURRENT_DATE,
    'xgboost_mood',
    '{"predicted_phq9_change": 1.8, "direction": "increase", "confidence": 0.68, "risk_window_days": 7}'::jsonb
  );
