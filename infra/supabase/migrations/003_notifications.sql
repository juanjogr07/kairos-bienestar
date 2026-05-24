-- 003_notifications.sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,          -- 'habit_reminder' | 'weekly_report' | 'streak_milestone'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- Índice para listar no leídas rápido
CREATE INDEX idx_notifications_user_unread
  ON notifications (user_id, read, created_at DESC);

-- Índice único para prevenir notificaciones duplicadas del mismo tipo por día
-- Garantiza idempotencia en check_habit_reminders ante requests concurrentes
CREATE UNIQUE INDEX idx_notifications_one_per_type_per_day
  ON notifications (user_id, type, (created_at::date));

-- ROLLBACK:
-- DROP TABLE IF EXISTS notifications;
