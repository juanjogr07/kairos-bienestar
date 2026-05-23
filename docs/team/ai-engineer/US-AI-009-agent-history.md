# US-AI-009 — Chat: Load Conversation History on Mount

**Owner:** Juan Gomez (AI Engineer)  
**Branch:** `feat/agent/feature/US-AI-009-agent-history`  
**Parallelizable con:** US-AI-006, US-AI-007, US-AI-008  
**Depends on:** US-AI-005 (lib/agent.ts), `GET /api/v1/agent/history` endpoint  
**Priority:** Medium — mejora la continuidad de la experiencia de chat

---

## Historia

Como usuario que regresa al chat, quiero ver los últimos mensajes de mi conversación anterior con Kairós, para no perder el contexto de lo que estábamos discutiendo.

---

## Situación actual

`app/chat/page.tsx` siempre inicia con `INITIAL` (mensajes hardcoded de demo). No llama a `GET /api/v1/agent/history`.

---

## Criterios de aceptación

1. Al cargar `/chat`, se llama `getAgentHistory()` para obtener mensajes previos
2. Si hay historial, se muestra en lugar de (o además de) los mensajes iniciales de demo
3. Si la llamada falla o no hay historial, se muestran los mensajes de demo como fallback
4. Máximo 20 mensajes cargados (para no saturar la pantalla)
5. El scroll se posiciona al final después de cargar el historial

---

## Implementación

### Agregar a `lib/agent.ts`

```typescript
export interface HistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export async function getAgentHistory(): Promise<HistoryMessage[]> {
  if (USE_MOCK) return [];
  const headers = await authHeaders();
  const res = await fetch(`${AGENT_URL}/api/v1/agent/history?limit=20`, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  return data.messages ?? [];
}
```

### Modificar `app/chat/page.tsx`

```typescript
// En useEffect al montar:
useEffect(() => {
  getAgentHistory().then((history) => {
    if (history.length === 0) return; // keep INITIAL demo messages
    const mapped: Msg[] = history.map((h) => ({
      id: h.id,
      from: h.role === "user" ? "me" : "kairos",
      text: h.content,
    }));
    setMessages(mapped);
  });
}, []);
```

### Mapeo de roles
- `role: "user"` → `from: "me"`
- `role: "assistant"` → `from: "kairos"`

### Fallback
Si `getAgentHistory()` retorna array vacío (error o sin historial), mantener `INITIAL` messages demo.

---

## Definition of Done

- [ ] `getAgentHistory()` agregado a `lib/agent.ts`
- [ ] Chat carga historial real si existe
- [ ] Fallback a mensajes demo si no hay historial o falla la llamada
- [ ] Scroll al final después de cargar historial
- [ ] Sin errores TypeScript
