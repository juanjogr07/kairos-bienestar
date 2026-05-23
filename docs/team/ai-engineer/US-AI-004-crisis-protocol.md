# US-AI-004 — Protocolo de crisis no bypasseable

**Asignado a:** AI Engineer  
**Prioridad:** Crítica  
**Estimación:** 2 puntos  
**Rama:** `feat/ai/US-AI-004-crisis-protocol`

---

## Historia de usuario

> Como responsable legal del producto, quiero que cuando un usuario muestre señales de crisis (PHQ-9 ≥ 15 o GAD-7 ≥ 15), el agente derive SIEMPRE a la Línea 106, sin importar qué mensaje envió el usuario ni qué instrucciones previas haya en el historial.

---

## Contexto técnico

Actualmente la derivación a crisis depende de que el sistema prompt sea respetado. Necesitamos un mecanismo de guardrail **fuera del LLM** que garantice la derivación.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `agent-service/agent/orchestrator.py` | Guardrail pre-LLM basado en triage |
| `agent-service/triage/tree.py` | Ya retorna `level: "crisis"` — no modificar |
| `agent-service/tests/test_crisis_guardrail.py` | Test del guardrail |

---

## Criterios de aceptación

- [ ] Si `triage_result["level"] == "crisis"`, el agente retorna la respuesta de crisis SIN llamar al LLM
- [ ] La respuesta de crisis siempre incluye: `"📞 Línea 106 — Salud mental, gratuita, disponible 24 horas."`
- [ ] El campo `playbook_activated` retorna `"crisis-escalation"`
- [ ] No importa lo que diga el mensaje del usuario — el guardrail tiene prioridad absoluta
- [ ] Test que verifica que con PHQ-9 = 18 nunca se llama al LLM

---

## Implementación

```python
# orchestrator.py — chat() al inicio, ANTES de llamar al LLM

CRISIS_RESPONSE = """Noto que estás atravesando un momento muy difícil. 
Gracias por confiar en mí, y quiero asegurarme de que recibas el apoyo adecuado.

📞 **Línea 106 — Salud mental**  
Gratuita · Confidencial · Disponible 24 horas  
Llama ahora si necesitas hablar con alguien.

Estoy aquí para acompañarte, pero en este momento lo más importante es que te conectes con un profesional."""

def chat(user_id: str, message: str) -> dict:
    triage_result = run_triage(user_id)

    # GUARDRAIL — no bypaseable por el LLM
    if triage_result["level"] == "crisis":
        mem.add_message(user_id, "user", message)
        mem.add_message(user_id, "assistant", CRISIS_RESPONSE)
        return {
            "reply": CRISIS_RESPONSE,
            "playbook_activated": "crisis-escalation",
            "suggested_habit": None,
        }

    # ... resto del flujo normal
```

---

## Definition of Done

- [ ] Guardrail implementado y testeado
- [ ] Test verifica que `client.chat.completions.create` NO es llamado en modo crisis
- [ ] PR → `dev` con revisión obligatoria del lead antes de mergear
- [ ] Documentar en el README del agent-service
