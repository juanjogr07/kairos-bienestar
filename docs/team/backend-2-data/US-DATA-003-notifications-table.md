# US-DATA-003 — Tabla de notificaciones y servicio de recordatorios

**Asignado a:** Backend 2 (Data)  
**Prioridad:** Baja  
**Estimación:** 3 puntos  
**Rama:** `feat/data/US-DATA-003-notifications`

---

## Historia de usuario

> Como usuario, quiero recibir un recordatorio si llevo 2 días sin completar un hábito activo, para mantener la consistencia sin olvidarme.

---

## Archivos a crear

| Archivo | Acción |
|---|---|
| `infra/supabase/migrations/003_notifications.sql` | Tabla + RLS |
| `api-service/services/notification_service.py` | Lógica de generación |
| `api-service/routers/notifications.py` | GET /notifications |
| `api-service/main.py` | Registrar router nuevo |
| `api-service/tests/test_notifications.py` | Tests |

---

## Schema de la tabla

```sql
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
```

---

## Contrato del endpoint

```python
# GET /api/v1/notifications
# Response: lista de notificaciones no leídas

[
  {
    "id": "uuid",
    "type": "habit_reminder",
    "title": "¿Cómo va tu hábito?",
    "body": "Llevas 2 días sin completar 'Sin teléfono la primera hora'",
    "created_at": "2026-05-23T10:00:00Z"
  }
]

# POST /api/v1/notifications/:id/read
# Marca como leída — { "success": true }
```

---

## Lógica de generación

La función `check_habit_reminders(user_id)` debe llamarse desde el endpoint de habits (cuando el usuario abre la app) o desde un cron job futuro:

```python
# api-service/services/notification_service.py
from datetime import date, timedelta

def check_habit_reminders(user_id: str) -> None:
    habits = supabase.table("habits").select("*").eq("user_id", user_id).eq("active", True).execute()
    
    for habit in habits.data:
        streak = supabase.table("streaks").select("last_completion").eq("habit_id", habit["id"]).execute()
        if not streak.data:
            continue
        
        last = date.fromisoformat(streak.data[0]["last_completion"])
        days_since = (date.today() - last).days
        
        if days_since >= 2:
            # verificar que no existe ya una notificación reciente
            existing = supabase.table("notifications") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("type", "habit_reminder") \
                .gte("created_at", (date.today() - timedelta(days=1)).isoformat()) \
                .execute()
            
            if not existing.data:
                supabase.table("notifications").insert({
                    "user_id": user_id,
                    "type": "habit_reminder",
                    "title": "¿Cómo va tu hábito?",
                    "body": f"Llevas {days_since} días sin completar '{habit['name']}'",
                }).execute()
```

---

## Criterios de aceptación

- [ ] Tabla `notifications` creada con RLS
- [ ] `GET /api/v1/notifications` retorna notificaciones no leídas
- [ ] `POST /api/v1/notifications/:id/read` marca como leída
- [ ] `check_habit_reminders` no duplica notificaciones
- [ ] Tests unitarios con mocks

---

## Definition of Done

- [ ] Migración SQL aplicada
- [ ] Endpoints funcionando
- [ ] PR → `dev`
- [ ] Notificar a Frontend para que muestre el badge de notificaciones en la nav (historia futura)
