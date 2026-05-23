import type { StoredEvent, SyncStatus } from "../shared/types"

export type { StoredEvent, SyncStatus }

export const BUFFER_KEY = "kairos_event_buffer"
export const TOKEN_KEY = "kairos_auth_token"
export const LAST_SYNC_AT_KEY = "kairos_last_sync_at"
export const LAST_SYNC_COUNT_KEY = "kairos_last_sync_count"
export const LAST_SYNC_ERROR_KEY = "kairos_last_sync_error"

/** Tope del buffer local. Evita exceder los ~5MB de chrome.storage.local. */
const BUFFER_MAX_SIZE = 500

export async function bufferEvent(event: StoredEvent): Promise<void> {
  const existing = await getBuffer()
  existing.push(event)
  const trimmed = existing.slice(-BUFFER_MAX_SIZE)
  await chrome.storage.local.set({ [BUFFER_KEY]: trimmed })
}

export async function bufferEvents(events: StoredEvent[]): Promise<void> {
  if (events.length === 0) return
  const existing = await getBuffer()
  const merged = existing.concat(events).slice(-BUFFER_MAX_SIZE)
  await chrome.storage.local.set({ [BUFFER_KEY]: merged })
}

export async function getBuffer(): Promise<StoredEvent[]> {
  const result = await chrome.storage.local.get(BUFFER_KEY)
  const value = result[BUFFER_KEY]
  return Array.isArray(value) ? (value as StoredEvent[]) : []
}

export async function clearBuffer(): Promise<void> {
  await chrome.storage.local.set({ [BUFFER_KEY]: [] })
}

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  const value = result[TOKEN_KEY]
  return typeof value === "string" && value.length > 0 ? value : null
}

export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function clearAuthToken(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_KEY)
}

/**
 * Acumula segundos por dominio para el día actual (UTC).
 * Solo cuenta eventos `tab_active`; scroll y otros se ignoran para el chart de uso.
 */
export async function getDailyStats(): Promise<Record<string, number>> {
  const buffer = await getBuffer()
  const today = new Date().toISOString().slice(0, 10)
  const stats: Record<string, number> = {}
  for (const event of buffer) {
    if (event.event_type !== "tab_active") continue
    if (!event.timestamp.startsWith(today)) continue
    stats[event.domain] = (stats[event.domain] ?? 0) + event.duration_seconds
  }
  return stats
}

export async function recordSyncSuccess(count: number): Promise<void> {
  await chrome.storage.local.set({
    [LAST_SYNC_AT_KEY]: new Date().toISOString(),
    [LAST_SYNC_COUNT_KEY]: count,
    [LAST_SYNC_ERROR_KEY]: null,
  })
}

export async function recordSyncError(message: string): Promise<void> {
  await chrome.storage.local.set({
    [LAST_SYNC_ERROR_KEY]: message,
  })
}

export async function getSyncStatus(): Promise<SyncStatus> {
  const result = await chrome.storage.local.get([
    LAST_SYNC_AT_KEY,
    LAST_SYNC_COUNT_KEY,
    LAST_SYNC_ERROR_KEY,
    BUFFER_KEY,
  ])
  const buffer = result[BUFFER_KEY]
  return {
    last_sync_at: (result[LAST_SYNC_AT_KEY] as string | null) ?? null,
    last_sync_count: (result[LAST_SYNC_COUNT_KEY] as number | null) ?? 0,
    last_error: (result[LAST_SYNC_ERROR_KEY] as string | null) ?? null,
    pending: Array.isArray(buffer) ? buffer.length : 0,
  }
}
