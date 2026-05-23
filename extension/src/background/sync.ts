import { getBuffer, clearBuffer, getAuthToken } from "../storage/buffer"

const API_URL = "http://localhost:8000"
const SYNC_ALARM = "kairos_sync"
const SYNC_INTERVAL_MINUTES = 5

// Backoff exponencial: 5s, 15s, 45s
const RETRY_DELAYS = [5000, 15000, 45000]
const MAX_RETRIES = RETRY_DELAYS.length

export function initSync(): void {
  chrome.alarms.create(SYNC_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  })

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SYNC_ALARM) {
      await syncToAPI()
    }
  })
}

/**
 * Intenta enviar eventos al backend con retry y backoff exponencial.
 *
 * - Máximo 3 reintentos (delays: 5s, 15s, 45s)
 * - Si el servidor retorna 401, NO reintenta (token inválido)
 * - Si los 3 reintentos fallan, los eventos se quedan en buffer
 *   para el próximo ciclo de sync (5 min)
 */
async function syncWithRetry(
  events: unknown[],
  token: string,
  attempt: number = 0
): Promise<{ success: boolean; sent: number }> {
  try {
    const response = await fetch(`${API_URL}/api/v1/events/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events }),
    })

    // 401 = token inválido — no tiene sentido reintentar
    if (response.status === 401) {
      await chrome.storage.local.remove("kairos_auth_token")
      console.error("[Kairós] Token inválido — sync cancelado, no se reintenta")
      return { success: false, sent: 0 }
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = (await response.json()) as { received: number }
    await clearBuffer()
    console.log(`[Kairós] Sync exitoso — ${data.received} eventos enviados`)
    return { success: true, sent: data.received }
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      console.error(
        `[Kairós] Sync fallido (intento ${attempt + 1}/${MAX_RETRIES}):`,
        err
      )
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]!))
      return syncWithRetry(events, token, attempt + 1)
    }

    console.error(
      "[Kairós] Sync agotó reintentos — eventos permanecen en buffer para próximo ciclo"
    )
    return { success: false, sent: 0 }
  }
}

export async function syncToAPI(): Promise<{ success: boolean; sent: number }> {
  const token = await getAuthToken()
  if (!token) {
    console.log("[Kairós] Sin token de auth — sync omitido")
    return { success: false, sent: 0 }
  }

  const buffer = await getBuffer()
  if (buffer.length === 0) {
    return { success: true, sent: 0 }
  }

  return syncWithRetry(buffer, token)
}
