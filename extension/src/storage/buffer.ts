export interface StoredEvent {
  domain: string
  duration_seconds: number
  event_type: "tab_active" | "tab_idle" | "scroll"
  scroll_speed?: number
  timestamp: string
}

const BUFFER_KEY = "kairos_event_buffer"
const TOKEN_KEY = "kairos_auth_token"

export async function bufferEvent(event: StoredEvent): Promise<void> {
  const existing = await getBuffer()
  existing.push(event)
  const trimmed = existing.slice(-500)
  await chrome.storage.local.set({ [BUFFER_KEY]: trimmed })
}

export async function getBuffer(): Promise<StoredEvent[]> {
  const result = await chrome.storage.local.get(BUFFER_KEY)
  return (result[BUFFER_KEY] as StoredEvent[]) ?? []
}

export async function clearBuffer(): Promise<void> {
  await chrome.storage.local.set({ [BUFFER_KEY]: [] })
}

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  return (result[TOKEN_KEY] as string) ?? null
}

export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function getDailyStats(): Promise<Record<string, number>> {
  const buffer = await getBuffer()
  const today = new Date().toISOString().split("T")[0]
  const todayEvents = buffer.filter((e) => e.timestamp.startsWith(today!))

  const stats: Record<string, number> = {}
  for (const event of todayEvents) {
    if (event.event_type === "tab_active") {
      stats[event.domain] = (stats[event.domain] ?? 0) + event.duration_seconds
    }
  }
  return stats
}

// El contador de reintentos vive en memoria como argumento `attempt` de
// `syncWithRetry` (extension/src/background/sync.ts). Cada ciclo de alarm
// arranca con attempt=0 y reintenta hasta 3 veces dentro del mismo
// invoke. Si los 3 fallan, el buffer se preserva intacto y el siguiente
// ciclo (~5 min) vuelve a intentar — equivalente a reiniciar el contador.

