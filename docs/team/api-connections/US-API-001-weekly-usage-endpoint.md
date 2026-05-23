# US-API-001 — Endpoint de uso semanal por día

**Asignado a:** API & Connections  
**Prioridad:** Alta  
**Estimación:** 2 puntos  
**Rama:** `feat/api/US-API-001-weekly-usage`  
**Requerido por:** US-FE-001 (Frontend)

---

## Historia de usuario

> Como frontend, necesito un endpoint que retorne el uso digital del usuario agrupado por día de los últimos 7 días, para pintar el gráfico semanal en el dashboard.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `api-service/routers/dashboard.py` | Agregar endpoint `/weekly-usage` |
| `api-service/tests/test_dashboard.py` | Test del nuevo endpoint |

**NO tocar:** `web/`, `agent-service/`, `infra/`

---

## Contrato del endpoint

```python
# GET /api/v1/dashboard/weekly-usage
# Headers: Authorization: Bearer <jwt>
# Response:

[
  { "day": "2026-05-17", "label": "Sáb", "minutes": 120 },
  { "day": "2026-05-18", "label": "Dom", "minutes": 310 },
  ...  # 7 items, del más antiguo al más reciente
]
```

---

## Criterios de aceptación

- [ ] Retorna exactamente 7 días (rellena con 0 si no hay datos)
- [ ] El campo `label` usa abreviación en español (Lun, Mar, Mié, Jue, Vie, Sáb, Dom)
- [ ] Requiere JWT válido (usa `Depends(get_current_user)`)
- [ ] Timeout de query < 500ms con índice en `usage_events.timestamp`

---

## Implementación sugerida

```python
# api-service/routers/dashboard.py
from datetime import date, timedelta

@router.get("/dashboard/weekly-usage")
async def weekly_usage(user_id: str = Depends(get_current_user)):
    today = date.today()
    days = [(today - timedelta(days=i)) for i in range(6, -1, -1)]
    
    labels = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"]
    
    res = supabase.table("usage_events") \
        .select("timestamp, duration_seconds") \
        .eq("user_id", user_id) \
        .gte("timestamp", days[0].isoformat()) \
        .execute()
    
    # agrupar por día
    day_totals: dict[str, int] = {d.isoformat(): 0 for d in days}
    for ev in res.data:
        day = ev["timestamp"][:10]
        if day in day_totals:
            day_totals[day] += ev["duration_seconds"]
    
    return [
        {"day": d.isoformat(), "label": labels[d.weekday()], "minutes": day_totals[d.isoformat()] // 60}
        for d in days
    ]
```

---

## Definition of Done

- [ ] Endpoint en `/api/v1/dashboard/weekly-usage`
- [ ] Test con datos seed
- [ ] Notificar a Frontend en el issue de Linear cuando esté en `dev`
- [ ] PR → `dev`
