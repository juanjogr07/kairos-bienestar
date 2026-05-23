# US-API-005 — Endpoint de Uso Semanal

**Owner:** Salome  
**Rama:** `feat/api/feature/US-API-005-weekly-usage`  
**Prioridad:** Alta — requerido por US-FE-006  
**Estimado:** 2h

---

## Historia

Como frontend, necesito un endpoint que devuelva los datos de uso de los últimos 14 días del usuario autenticado, incluyendo resultados ML para mostrar en la gráfica del dashboard.

---

## Criterios de Aceptación

- [ ] `GET /api/v1/usage/weekly` requiere JWT válido
- [ ] Devuelve array de 14 objetos ordenados por fecha ascendente
- [ ] Cada objeto incluye: `date`, `total_usage_min`, `nocturnal_min`, `nocturnal_ratio`, `anomaly_score`, `cluster_name`
- [ ] Si un día no tiene datos → `{date, total_usage_min: 0, ...rest: 0}`
- [ ] Query a `daily_features` JOIN `ml_results` en Supabase
- [ ] Tiempo de respuesta < 500ms

## Contrato de respuesta

```json
{
  "days": [
    {
      "date": "2026-05-17",
      "total_usage_min": 245,
      "nocturnal_min": 45,
      "nocturnal_ratio": 0.18,
      "anomaly_score": 0.22,
      "cluster_name": "moderate",
      "is_anomaly": false
    }
  ],
  "period_start": "2026-05-10",
  "period_end": "2026-05-23"
}
```

## Implementación sugerida

```python
# api-service/routers/usage.py
@router.get("/usage/weekly")
async def weekly_usage(user=Depends(get_current_user)):
    rows = await supabase.table("daily_features")
        .select("date,total_usage_min,nocturnal_min,nocturnal_ratio,ml_results(result)")
        .eq("user_id", user.id)
        .gte("date", fourteen_days_ago)
        .order("date")
        .execute()
    return {"days": _merge_ml_results(rows.data), ...}
```

## Definition of Done

- `curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/v1/usage/weekly` → 200 con array
- Funciona si `daily_features` está vacía (devuelve 14 días con ceros)
- Tests: `pytest api-service/tests/test_usage.py`

## Archivos

- `api-service/routers/usage.py` — crear
- `api-service/main.py` — registrar router
