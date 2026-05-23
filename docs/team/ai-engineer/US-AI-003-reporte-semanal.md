# US-AI-003 — Reporte semanal generado por el agente

> ✅ **IMPLEMENTADO** — Mergeado en `dev` (PR #4, commit `acab20d`). Ver plan maestro: `docs/plans/2026-05-23-implementacion-pendiente.md`

**Asignado a:** AI Engineer  
**Prioridad:** Media  
**Estimación:** 3 puntos  
**Rama:** `feat/ai/US-AI-003-reporte-semanal`  
**Estado:** ✅ Mergeado en `dev`

---

## Historia de usuario

> Como usuario, quiero recibir un reporte semanal generado por Kairós con un resumen de mis patrones digitales, mis scores de ánimo y los hábitos completados, para entender mi progreso de la semana en 2 minutos.

---

## Contexto técnico

El endpoint `POST /api/v1/agent/trigger` con `{"trigger": "weekly_report"}` ya existe en `routers/chat.py` y llama a `agent_chat` con un mensaje predefinido. Esta historia mejora la calidad del reporte con un prompt especializado.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `agent-service/agent/orchestrator.py` | Añadir función `generate_weekly_report` |
| `agent-service/routers/chat.py` | Conectar trigger al nuevo generador |
| `agent-service/tests/test_weekly_report.py` | Tests con mock |

---

## Criterios de aceptación

- [x] El reporte incluye: minutos totales de uso, top 3 dominios, comparación vs semana anterior, score PHQ-9 y tendencia, hábitos completados / total
- [x] Formato Markdown con secciones claras (`## Uso Digital`, `## Estado de Ánimo`, `## Hábitos`)
- [x] El reporte se genera en < 10 segundos (sin tool loops innecesarios)
- [x] Si no hay datos suficientes (< 3 días), retorna mensaje indicándolo

---

## Implementación sugerida

```python
# orchestrator.py
WEEKLY_REPORT_PROMPT = """Genera un reporte semanal de bienestar digital en formato Markdown.

Estructura OBLIGATORIA:
## Resumen de la semana
[2 líneas con los hallazgos principales]

## Uso Digital
[minutos totales, top dominios, comparación semana anterior]

## Estado de Ánimo
[PHQ-9 actual vs anterior, tendencia]

## Hábitos
[completados / total, rachas]

## Para la próxima semana
[1 sugerencia concreta basada en los datos]

Tono: cálido, sin juicios. Máx 300 palabras."""

def generate_weekly_report(user_id: str) -> dict:
    # llama a chat() con el prompt especial
    return chat(user_id=user_id, message=WEEKLY_REPORT_PROMPT)
```

---

## Definition of Done

- [x] `POST /api/v1/agent/trigger` con `weekly_report` retorna reporte en Markdown
- [x] Tests mockeando las 4 herramientas del agente (8 tests en `tests/test_weekly_report.py`)
- [x] PR → `dev` (PR #4)
- [ ] **PENDIENTE:** Avisar a Frontend — US-FE-004 (vista del reporte) aún no implementada
