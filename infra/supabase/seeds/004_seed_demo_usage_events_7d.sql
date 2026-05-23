-- 004_seed_demo_usage_events_7d.sql
-- Seed incremental: 7 dias de usage_events para el usuario demo.
-- Reemplaza DEMO_USER_UUID con el UUID real de Supabase Auth.

-- Opcional: validar UUID antes de ejecutar
-- SELECT id, email FROM auth.users WHERE id = 'DEMO_USER_UUID';

-- Limpieza idempotente: elimina solo los ultimos 7 dias del usuario demo.
DELETE FROM usage_events
WHERE user_id = 'DEMO_USER_UUID'
  AND timestamp >= NOW() - INTERVAL '7 days';

INSERT INTO usage_events (user_id, domain, duration_seconds, event_type, scroll_speed, source, timestamp)
VALUES
  -- Dia 1 (hace 6 dias)
  ('DEMO_USER_UUID', 'youtube.com', 2700, 'tab_active', 320.0, 'extension', NOW() - INTERVAL '6 days' + INTERVAL '14 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 1800, 'tab_active', 920.3, 'extension', NOW() - INTERVAL '6 days' + INTERVAL '21 hours'),
  ('DEMO_USER_UUID', 'twitter.com', 900, 'tab_active', 755.1, 'extension', NOW() - INTERVAL '6 days' + INTERVAL '23 hours'),

  -- Dia 2
  ('DEMO_USER_UUID', 'youtube.com', 3600, 'tab_active', 280.0, 'extension', NOW() - INTERVAL '5 days' + INTERVAL '20 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 2400, 'tab_active', 1050.5, 'extension', NOW() - INTERVAL '5 days' + INTERVAL '22 hours'),
  ('DEMO_USER_UUID', 'reddit.com', 1500, 'tab_active', 680.0, 'extension', NOW() - INTERVAL '5 days' + INTERVAL '23 hours 30 minutes'),

  -- Dia 3
  ('DEMO_USER_UUID', 'docs.google.com', 4500, 'tab_active', 50.0, 'extension', NOW() - INTERVAL '4 days' + INTERVAL '10 hours'),
  ('DEMO_USER_UUID', 'youtube.com', 1800, 'tab_active', 400.0, 'extension', NOW() - INTERVAL '4 days' + INTERVAL '13 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 2700, 'tab_active', 875.0, 'extension', NOW() - INTERVAL '4 days' + INTERVAL '22 hours 30 minutes'),

  -- Dia 4
  ('DEMO_USER_UUID', 'twitter.com', 3600, 'tab_active', 820.0, 'extension', NOW() - INTERVAL '3 days' + INTERVAL '21 hours'),
  ('DEMO_USER_UUID', 'youtube.com', 2100, 'tab_active', 350.0, 'extension', NOW() - INTERVAL '3 days' + INTERVAL '15 hours'),

  -- Dia 5
  ('DEMO_USER_UUID', 'instagram.com', 3200, 'tab_active', 960.0, 'extension', NOW() - INTERVAL '2 days' + INTERVAL '22 hours'),
  ('DEMO_USER_UUID', 'tiktok.com', 2400, 'tab_active', 1200.0, 'extension', NOW() - INTERVAL '2 days' + INTERVAL '23 hours'),

  -- Dia 6 (ayer)
  ('DEMO_USER_UUID', 'youtube.com', 2700, 'tab_active', 310.0, 'extension', NOW() - INTERVAL '1 day' + INTERVAL '14 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 1800, 'tab_active', 890.0, 'extension', NOW() - INTERVAL '1 day' + INTERVAL '21 hours 30 minutes'),
  ('DEMO_USER_UUID', 'docs.google.com', 3600, 'tab_active', 45.0, 'extension', NOW() - INTERVAL '1 day' + INTERVAL '11 hours'),

  -- Hoy
  ('DEMO_USER_UUID', 'youtube.com', 1200, 'tab_active', 400.0, 'extension', NOW() - INTERVAL '2 hours'),
  ('DEMO_USER_UUID', 'instagram.com', 900, 'tab_active', 780.0, 'extension', NOW() - INTERVAL '1 hour');
