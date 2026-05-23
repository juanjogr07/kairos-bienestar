# US-AI-005 — Integración chat frontend ↔ agent-service real

**Asignado a:** AI Engineer  
**Prioridad:** Alta  
**Estimación:** 3 puntos  
**Rama:** `feat/ai/US-AI-005-chat-integration`  
**Depende de:** US-API-004 (Salome debe exponer getAgentToken en lib/api.ts)

---

## Historia de usuario

> Como usuario, quiero que el chat con Kairós use el agente real (agent-service:8001) en lugar de respuestas hardcodeadas, para que las respuestas reflejen mis datos reales de uso y bienestar.

---

## Contexto técnico

El chat (`web/app/chat/page.tsx`) actualmente usa `setTimeout` con respuestas hardcodeadas. El `agent-service` está corriendo en `localhost:8001` con el endpoint `POST /api/v1/agent/chat` esperando un JWT de Supabase. Esta historia conecta los dos.

**Archivos a crear/modificar:**

| Archivo | Acción | Owner |
|---|---|---|
| `web/lib/agent.ts` | Crear — función `sendAgentMessage(msg)` | AI Engineer |
| `web/app/chat/page.tsx` | Modificar — reemplazar setTimeout por llamada real | AI Engineer |

**NO tocar:** `agent-service/`, `web/lib/api.ts`, `web/lib/supabase.ts`

---

## Criterios de aceptación

- [ ] `web/lib/agent.ts` exporta `sendAgentMessage(message: string): Promise<AgentResponse>`
- [ ] El JWT de Supabase se obtiene de `supabase.auth.getSession()` y se incluye en `Authorization: Bearer`
- [ ] Si el agente retorna `suggested_habit != null`, el botón "Agregar hábito sugerido" llama a `POST /api/v1/habits` y muestra toast de confirmación
- [ ] Si el agente retorna 503 (key expirada), muestra mensaje amigable: _"El copiloto está temporalmente fuera de servicio. Intenta en unos minutos."_
- [ ] Loading state: input deshabilitado + typing indicator mientras espera respuesta
- [ ] En desarrollo sin OpenRouter key: fallback a mock response definido en `web/lib/mock-data.ts`

---

## Implementación

### 1. Crear `web/lib/agent.ts`

```typescript
// web/lib/agent.ts
import { createClient } from "@/lib/supabase"

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:8001"
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export interface AgentResponse {
  reply: string
  playbook_activated: string | null
  suggested_habit: string | null
}

export async function sendAgentMessage(message: string): Promise<AgentResponse> {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1400))
    return {
      reply: "Entiendo. Vamos paso a paso. ¿Te parece si esta noche dejas el teléfono fuera del cuarto a partir de las 22:30?",
      playbook_activated: null,
      suggested_habit: null,
    }
  }

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("No session")

  const res = await fetch(`${AGENT_URL}/api/v1/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ message }),
  })

  if (res.status === 503) {
    throw new Error("SERVICE_UNAVAILABLE")
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`)
  }

  return res.json() as Promise<AgentResponse>
}
```

### 2. Actualizar `web/app/chat/page.tsx` — reemplazar `handleSend`

```typescript
// Reemplazar el bloque handleSend con:
const handleSend = async (text?: string) => {
  const value = (text ?? input).trim()
  if (!value || typing) return
  const id = String(Date.now())
  setMessages(m => [...m, { id, from: "me", text: value }])
  setInput("")
  setTyping(true)
  try {
    const res = await sendAgentMessage(value)
    setMessages(m => [
      ...m,
      {
        id: id + "-r",
        from: "kairos",
        text: res.reply,
        showSuggestion: !!res.suggested_habit,
        suggestedHabit: res.suggested_habit ?? undefined,
      },
    ])
  } catch (err: unknown) {
    const msg = err instanceof Error && err.message === "SERVICE_UNAVAILABLE"
      ? "El copiloto está temporalmente fuera de servicio. Intenta en unos minutos."
      : "Hubo un error al conectar con Kairós. Verifica tu conexión."
    setMessages(m => [
      ...m,
      { id: id + "-err", from: "kairos", text: msg },
    ])
  } finally {
    setTyping(false)
  }
}
```

### 3. Botón "Agregar hábito sugerido"

```typescript
// En el componente Bubble, cuando showSuggestion es true:
async function handleAddHabit(habitName: string) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  await fetch(`${API_URL}/api/v1/habits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ name: habitName, frequency: "daily" }),
  })
  // mostrar toast: "✅ Hábito agregado: <nombre>"
}
```

---

## Variables de entorno necesarias

En `web/kairos-nextjs/.env.local` ya existen:
```
NEXT_PUBLIC_AGENT_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK=false    # cambiar a true si no hay OpenRouter key
```

Si la OpenRouter key está expirada, setear `NEXT_PUBLIC_USE_MOCK=true` para que la demo funcione con respuestas mock de calidad.

---

## Definition of Done

- [ ] `web/lib/agent.ts` creado con `sendAgentMessage()`
- [ ] `chat/page.tsx` usa `sendAgentMessage` (no más setTimeout hardcodeado)
- [ ] Botón "Agregar hábito sugerido" hace POST a `/api/v1/habits`
- [ ] Error 503 muestra mensaje amigable
- [ ] `NEXT_PUBLIC_USE_MOCK=true` funciona como fallback
- [ ] PR → `dev` con descripción de cómo testear
- [ ] Notificar a Frontend (Juan Camilo) para coordinar el tipado de `Msg`
