-- Kairós — Seed usuario demo para presentación
-- IMPORTANTE: Reemplazar DEMO_USER_UUID con el UUID real del usuario demo en Supabase Auth
-- Para obtener el UUID: Supabase Dashboard → Authentication → Users → copiar ID del usuario demo

-- ⚠️  INSTRUCCIÓN: Buscar y reemplazar 'DEMO_USER_UUID' con el UUID real antes de ejecutar

-- 1. Encuestas (PHQ-9 y GAD-7 de hace 7 días — onboarding completado)
INSERT INTO survey_responses (user_id, survey_type, responses, total_score, created_at)
VALUES
  (
    'DEMO_USER_UUID',
    'phq9',
    '{"q1":2,"q2":1,"q3":2,"q4":2,"q5":1,"q6":0,"q7":1,"q8":0,"q9":0}',
    9,
    NOW() - INTERVAL '7 days'
  ),
  (
    'DEMO_USER_UUID',
    'gad7',
    '{"q1":2,"q2":1,"q3":1,"q4":2,"q5":0,"q6":1,"q7":1}',
    8,
    NOW() - INTERVAL '7 days'
  )
ON CONFLICT DO NOTHING;

-- 2. Eventos de uso (últimos 7 días — patrón nocturno evidente)
INSERT INTO usage_events (user_id, domain, duration_seconds, event_type, scroll_speed, source, timestamp)
VALUES
  -- Día 1 (hace 6 días)
  ('DEMO_USER_UUID', 'youtube.com', 2700, 'tab_active', 320.0, 'extension', NOW() - INTERVAL '6 days' + INTERVAL '14 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 1800, 'tab_active', 920.3, 'extension', NOW() - INTERVAL '6 days' + INTERVAL '21 hours'),
  ('DEMO_USER_UUID', 'twitter.com', 900, 'tab_active', 755.1, 'extension', NOW() - INTERVAL '6 days' + INTERVAL '23 hours'),
  -- Día 2
  ('DEMO_USER_UUID', 'youtube.com', 3600, 'tab_active', 280.0, 'extension', NOW() - INTERVAL '5 days' + INTERVAL '20 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 2400, 'tab_active', 1050.5, 'extension', NOW() - INTERVAL '5 days' + INTERVAL '22 hours'),
  ('DEMO_USER_UUID', 'reddit.com', 1500, 'tab_active', 680.0, 'extension', NOW() - INTERVAL '5 days' + INTERVAL '23 hours 30 minutes'),
  -- Día 3
  ('DEMO_USER_UUID', 'docs.google.com', 4500, 'tab_active', 50.0, 'extension', NOW() - INTERVAL '4 days' + INTERVAL '10 hours'),
  ('DEMO_USER_UUID', 'youtube.com', 1800, 'tab_active', 400.0, 'extension', NOW() - INTERVAL '4 days' + INTERVAL '13 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 2700, 'tab_active', 875.0, 'extension', NOW() - INTERVAL '4 days' + INTERVAL '22 hours 30 minutes'),
  -- Día 4
  ('DEMO_USER_UUID', 'twitter.com', 3600, 'tab_active', 820.0, 'extension', NOW() - INTERVAL '3 days' + INTERVAL '21 hours'),
  ('DEMO_USER_UUID', 'youtube.com', 2100, 'tab_active', 350.0, 'extension', NOW() - INTERVAL '3 days' + INTERVAL '15 hours'),
  -- Día 5
  ('DEMO_USER_UUID', 'instagram.com', 3200, 'tab_active', 960.0, 'extension', NOW() - INTERVAL '2 days' + INTERVAL '22 hours'),
  ('DEMO_USER_UUID', 'tiktok.com', 2400, 'tab_active', 1200.0, 'extension', NOW() - INTERVAL '2 days' + INTERVAL '23 hours'),
  -- Día 6 (ayer)
  ('DEMO_USER_UUID', 'youtube.com', 2700, 'tab_active', 310.0, 'extension', NOW() - INTERVAL '1 day' + INTERVAL '14 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 1800, 'tab_active', 890.0, 'extension', NOW() - INTERVAL '1 day' + INTERVAL '21 hours 30 minutes'),
  ('DEMO_USER_UUID', 'docs.google.com', 3600, 'tab_active', 45.0, 'extension', NOW() - INTERVAL '1 day' + INTERVAL '11 hours'),
  -- Hoy
  ('DEMO_USER_UUID', 'youtube.com', 1200, 'tab_active', 400.0, 'extension', NOW() - INTERVAL '2 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 900, 'tab_active', 780.0, 'extension', NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- 3. Resultados ML pre-calculados (para que el agente pueda responder sin correr el worker)
INSERT INTO ml_results (user_id, model_type, result, computed_at)
VALUES
  (
    'DEMO_USER_UUID',
    'isolation_forest',
    '{"anomaly_score": -0.31, "is_anomaly": true, "risk_level": "medium", "flagged_features": ["nocturnal_ratio", "scroll_speed_avg"]}',
    NOW()
  ),
  (
    'DEMO_USER_UUID',
    'xgboost_mood',
    '{"predicted_phq9_change": 1.8, "direction": "slight_increase", "confidence": 0.68, "risk_window_days": 7}',
    NOW()
  ),
  (
    'DEMO_USER_UUID',
    'kmeans_cluster',
    '{"cluster": 1, "profile": "nocturnal_heavy_user", "confidence": 0.84, "description": "Alto uso nocturno y redes sociales, bajo uso productivo en horario laboral"}',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- 4. Hábito de ejemplo (con racha de 3 días)
INSERT INTO habits (id, user_id, name, playbook_slug, frequency, active)
VALUES
  (
    gen_random_uuid(),
    'DEMO_USER_UUID',
    'Sin teléfono la primera hora del día',
    'nocturnal-use-pattern',
    'daily',
    true
  )
ON CONFLICT DO NOTHING;

-- 5. Racha del hábito (ejecutar después del INSERT de habits)
INSERT INTO streaks (habit_id, user_id, current_streak, longest_streak, last_completion, grace_days_used)
SELECT
  h.id,
  h.user_id,
  3,
  5,
  CURRENT_DATE - 1,
  0
FROM habits h
WHERE h.user_id = 'DEMO_USER_UUID'
  AND h.name = 'Sin teléfono la primera hora del día'
ON CONFLICT (habit_id) DO UPDATE
  SET current_streak = 3, longest_streak = 5, last_completion = CURRENT_DATE - 1;
