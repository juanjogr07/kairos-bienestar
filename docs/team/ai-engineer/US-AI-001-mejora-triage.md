# US-AI-001 — Mejora del árbol de triaje con contexto temporal

**Asignado a:** AI Engineer  
**Prioridad:** Alta  
**Estimación:** 3 puntos  
**Rama:** `feat/ai/US-AI-001-triage-temporal`

---

## Historia de usuario

> Como usuario de Kairós, quiero que el agente considere la tendencia de mis encuestas en el tiempo (no solo la última), para que el triaje sea más preciso y no me genere falsas alarmas por un mal día aislado.

---

## Contexto técnico

El árbol de triaje actual (`agent-service/triage/tree.py`) solo usa el score más reciente de PHQ-9 y GAD-7. Un usuario que tuvo un mal día (score 14) y hoy está bien (score 6) sigue activando `nivel mood`. 

La mejora: si el score bajó ≥ 3 puntos respecto a la semana anterior, el nivel debería ser `improving` en lugar de `mood`.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `agent-service/triage/tree.py` | Añadir lógica de tendencia |
| `agent-service/agent/tools/get_survey_scores.py` | Retornar historial de 2 semanas |
| `agent-service/tests/test_triage.py` | Nuevos casos de test |

**NO tocar:** `agent-service/routers/`, `agent-service/config.py`, `web/`

---

## Criterios de aceptación

- [ ] Si PHQ-9 actual < PHQ-9 de hace 7 días - 3, el nivel es `improving` aunque esté en rango `mood`
- [ ] Si PHQ-9 > 15 (crisis), el nivel es siempre `crisis` sin excepción (tendencia no aplica)
- [ ] `get_survey_scores` retorna `{"phq9_score": int, "phq9_prev_score": int | None, ...}`
- [ ] 2 tests nuevos: `test_improving_trend` y `test_crisis_ignores_trend`
- [ ] `pytest tests/ -v` — todos en verde

---

## Implementación sugerida

```python
# triage/tree.py — agregar después del check de crisis

phq9_prev = surveys.get("phq9_prev_score")
if phq9_prev and phq9 is not None:
    if phq9_prev - phq9 >= 3 and phq9 < 15:
        return {
            "level": "improving",
            "playbook_slug": "momentum-builder",
            "reason": f"PHQ-9 bajó de {phq9_prev} a {phq9} en 7 días",
            "context": {"surveys": surveys},
        }
```

```python
# agent/tools/get_survey_scores.py — añadir query de score anterior
prev_res = supabase.table("survey_responses") \
    .select("total_score") \
    .eq("user_id", user_id) \
    .eq("survey_type", "phq9") \
    .order("created_at", desc=True) \
    .range(1, 1) \
    .execute()

phq9_prev = prev_res.data[0]["total_score"] if prev_res.data else None
```

---

## Definition of Done

- [ ] Código en rama `feat/ai/US-AI-001-triage-temporal`
- [ ] Tests pasando (`pytest tests/ -v`)
- [ ] PR abierto hacia `dev` con descripción del cambio
- [ ] Notificar a AI-Engineer lead si el nivel `improving` necesita un playbook nuevo (coordinar con Backend-2-Data)
