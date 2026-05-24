-- Seed 006 — Demo: notification trigger
-- Ajusta last_completion a 3 días atrás en UN hábito del demo user
-- para que check_habit_reminders genere una notificación durante el demo.
-- Ejecutar DESPUÉS de 002_seed_demo_user.sql.
-- ⚠️  INSTRUCCIÓN: Reemplazar 'DEMO_USER_UUID' con el UUID real antes de ejecutar.

DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = 'DEMO_USER_UUID') THEN
    RAISE EXCEPTION 'DEMO_USER_UUID no encontrado en auth.users — ejecutar create_demo_auth_user primero.';
  END IF;
END $;

UPDATE streaks
SET last_completion = CURRENT_DATE - 3
WHERE habit_id = (
    SELECT h.id
    FROM habits h
    WHERE h.user_id = 'DEMO_USER_UUID'
    ORDER BY h.created_at
    LIMIT 1
);
