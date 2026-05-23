-- 003_seed_demo_survey_responses.sql
-- Seed incremental para encuestas PHQ-9 y GAD-7 del usuario demo.
-- Reemplaza DEMO_USER_UUID con el UUID real de Supabase Auth.

-- Opcional: validar UUID antes de ejecutar
-- SELECT id, email FROM auth.users WHERE id = 'DEMO_USER_UUID';

-- Idempotencia: elimina encuestas demo previas de estos tipos.
DELETE FROM survey_responses
WHERE user_id = 'DEMO_USER_UUID'
  AND survey_type IN ('phq9', 'gad7');

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
  );
