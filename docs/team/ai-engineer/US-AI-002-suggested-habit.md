# US-AI-002 — El agente sugiere hábitos concretos al finalizar el chat

> ✅ **IMPLEMENTADO** — Mergeado en `dev` (PR #2, commit `5a08fab`). Ver plan maestro: `docs/plans/2026-05-23-implementacion-pendiente.md`

**Asignado a:** AI Engineer  
**Prioridad:** Alta  
**Estimación:** 2 puntos  
**Rama:** `feat/ai/US-AI-002-suggested-habit`  
**Estado:** ✅ Mergeado en `dev`

---

## Historia de usuario

> Como usuario, quiero que al final de cada conversación con Kairós reciba una sugerencia de hábito concreta (nombre + frecuencia), para poder agregarlo a mi lista con un clic sin tener que escribirlo manualmente.

---

## Contexto técnico

El campo `suggested_habit` en `ChatResponse` ya existe en el contrato pero siempre retorna `None`. Esta historia lo implementa. El agente debe extraer el hábito sugerido del texto de respuesta y estructurarlo.

**Contrato que debes respetar** (no cambiar la estructura):
```python
# routers/chat.py — ChatResponse
class ChatResponse(BaseModel):
    reply: str
    playbook_activated: Optional[str]
    suggested_habit: Optional[str]    # ← poblar este campo
```

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `agent-service/agent/orchestrator.py` | Extraer hábito del texto final |
| `agent-service/tests/test_orchestrator.py` | Crear con mock de OpenRouter |

**NO tocar:** `agent-service/routers/chat.py`, `web/`

---

## Criterios de aceptación

- [x] Si la respuesta del agente incluye una sugerencia de hábito, `suggested_habit` contiene el nombre del hábito (string corto, máx 60 chars)
- [x] Si no hay sugerencia, `suggested_habit` es `None`
- [x] El hábito sugerido usa el mismo lenguaje que aparece en el texto de respuesta
- [x] No rompe el contrato existente de `ChatResponse`

---

## Implementación sugerida

Añadir al system prompt una instrucción para que el LLM marque el hábito:

```python
# orchestrator.py — al final del SYSTEM_PROMPT
"""
8. Si sugieres un hábito específico, termina tu respuesta con exactamente esta línea:
HÁBITO_SUGERIDO: <nombre del hábito en 5 palabras o menos>
Esta línea no la ve el usuario.
"""
```

Luego en el parser:

```python
# orchestrator.py — al extraer final_text
HABIT_MARKER = "HÁBITO_SUGERIDO:"
suggested_habit = None
if HABIT_MARKER in final_text:
    lines = final_text.split("\n")
    for line in lines:
        if line.startswith(HABIT_MARKER):
            suggested_habit = line.replace(HABIT_MARKER, "").strip()
            final_text = final_text.replace(line, "").strip()
            break
```

---

## Definition of Done

- [x] `suggested_habit` retorna string cuando el agente sugiere un hábito
- [x] El marcador `HÁBITO_SUGERIDO:` no aparece en `reply` (se extrae y elimina)
- [x] Test con mock que verifica extracción correcta
- [x] PR → `dev` (PR #2)
