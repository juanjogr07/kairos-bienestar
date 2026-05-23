# US-DATA-001 — Lógica de streaks con grace days

**Asignado a:** Backend 2 (Data)  
**Prioridad:** Alta  
**Estimación:** 3 puntos  
**Rama:** `feat/data/US-DATA-001-streak-logic`

---

## Historia de usuario

> Como usuario, quiero que si me salto un día de un hábito por una razón válida (tengo 1 "grace day"), mi racha no se rompa, para no sentirme castigado por un día difícil.

---

## Contexto técnico

La tabla `streaks` tiene `grace_days_used` y `grace_days_allowed` (default 1). Actualmente el endpoint `POST /api/v1/habits/:id/complete` marca el hábito como completado, pero no tiene lógica de streaks real.

---

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `api-service/services/streak_service.py` | Crear servicio de lógica de streaks |
| `api-service/routers/habits.py` | Usar el servicio al completar |
| `api-service/tests/test_streak_service.py` | Tests unitarios |

**NO tocar:** `web/`, `agent-service/`, `infra/supabase/migrations/` (el schema ya está)

---

## Lógica de negocio

```
Al llamar a POST /habits/:id/complete:

1. Obtener streak actual del hábito
2. Calcular días desde last_completion:
   - = 1 día → completado normal, streak + 1
   - = 2 días → gap de 1 día:
     - Si grace_days_used < grace_days_allowed → usar grace day, streak + 1
     - Si no hay grace days → streak se rompe (reset a 1)
   - > 2 días → streak se rompe (reset a 1), grace_days_used = 0
3. Actualizar longest_streak si current > longest
4. Retornar { streak: int, used_grace_day: bool, broken: bool }
```

---

## Criterios de aceptación

- [ ] Completado normal (1 día de gap): `streak + 1`, sin grace day
- [ ] Gap de 1 día con grace day disponible: `streak + 1`, `grace_days_used + 1`
- [ ] Gap de 1 día sin grace day: `streak = 1` (reset), `broken = true`
- [ ] Gap > 1 día: siempre reset a 1
- [ ] `longest_streak` se actualiza si `current_streak > longest_streak`
- [ ] 5 tests unitarios cubriendo todos los casos (sin DB — usar mocks)

---

## Implementación sugerida

```python
# api-service/services/streak_service.py
from datetime import date

def calculate_streak_update(streak: dict, completion_date: date) -> dict:
    """
    streak: {"current_streak": int, "longest_streak": int, 
             "last_completion": date, "grace_days_used": int, 
             "grace_days_allowed": int}
    """
    if streak["last_completion"] is None:
        return {**streak, "current_streak": 1, "broken": False, "used_grace_day": False}
    
    gap = (completion_date - streak["last_completion"]).days
    
    if gap == 1:
        new_streak = streak["current_streak"] + 1
        used_grace = False
        broken = False
    elif gap == 2 and streak["grace_days_used"] < streak["grace_days_allowed"]:
        new_streak = streak["current_streak"] + 1
        used_grace = True
        broken = False
    else:
        new_streak = 1
        used_grace = False
        broken = True
    
    return {
        **streak,
        "current_streak": new_streak,
        "longest_streak": max(new_streak, streak["longest_streak"]),
        "grace_days_used": streak["grace_days_used"] + (1 if used_grace else 0),
        "last_completion": completion_date,
        "broken": broken,
        "used_grace_day": used_grace,
    }
```

---

## Definition of Done

- [ ] `streak_service.py` implementado y testeado (5 tests)
- [ ] `routers/habits.py` usa el servicio
- [ ] PR → `dev`
- [ ] Notificar a Frontend (US-FE-003 lo muestra en la UI)
