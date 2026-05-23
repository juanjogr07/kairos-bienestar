# US-FE-002 — Mejoras de UX en el chat

**Asignado a:** Frontend  
**Prioridad:** Alta  
**Estimación:** 2 puntos  
**Rama:** `feat/fe/US-FE-002-chat-ux`

---

## Historia de usuario

> Como usuario, quiero que el chat con Kairós se sienta fluido y natural: que los mensajes aparezcan con animación, que vea cuando el agente está "pensando", y que pueda enviar con Enter, para que la experiencia sea similar a WhatsApp o ChatGPT.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `web/app/chat/page.tsx` | Mejorar flujo de envío y scroll |
| `web/components/chat-bubble.tsx` | Crear componente nuevo |
| `web/components/typing-indicator.tsx` | Crear componente nuevo |

**NO tocar:** `web/lib/agent.ts` (la lógica de llamada al backend es tuya pero no cambies el contrato), nada fuera de `web/`

---

## Criterios de aceptación

- [ ] Enter envía el mensaje (Shift+Enter hace salto de línea)
- [ ] Indicador de "escribiendo..." (3 puntos animados) mientras espera respuesta del agente
- [ ] Scroll automático al último mensaje al recibir respuesta
- [ ] Burbuja de usuario: alineada a la derecha, color primario
- [ ] Burbuja del agente: alineada a la izquierda, fondo gris claro
- [ ] Timestamp debajo de cada burbuja (hora:minutos)
- [ ] Input deshabilitado mientras el agente está respondiendo
- [ ] En modo mock: respuesta simulada con delay de 1.5s

---

## Implementación del typing indicator

```tsx
// web/components/typing-indicator.tsx
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-gray-100 rounded-2xl w-fit">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
```

## Mock delay para desarrollo

```typescript
// web/lib/agent.ts — en modo mock
if (USE_MOCK) {
  await new Promise(r => setTimeout(r, 1500))
  return { reply: mockAgentReply, playbook_activated: null, suggested_habit: null }
}
```

---

## Definition of Done

- [ ] Enter funciona para enviar
- [ ] Typing indicator visible durante la espera
- [ ] Burbujas diferenciadas usuario/agente
- [ ] Sin errores de consola
- [ ] PR → `dev`
