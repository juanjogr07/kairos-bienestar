import {
  clearAuthToken,
  clearBuffer,
  getAuthToken,
  getBuffer,
  recordSyncError,
  recordSyncSuccess,
} from "../storage/buffer"
import type { SyncResult } from "../shared/types"

/**
 * URL del backend. Se inyecta en build-time vía DefinePlugin (`KAIROS_API_URL`).
 * Fallback a localhost para desarrollo si no fue definida.
 */
declare const KAIROS_API_URL: string | undefined
export const API_URL =
  typeof KAIROS_API_URL === "string" && KAIROS_API_URL.length > 0
    ? KAIROS_API_URL
    : "http://localhost:8000"

const SYNC_ALARM = "kairos_sync"
const SYNC_RETRY_ALARM_PREFIX = "kairos_sync_retry_"
const SYNC_INTERVAL_MINUTES = 5

/**
 * Backoff: 5s, 15s, 45s ⇒ máximo 3 reintentos (4 intentos totales).
 * Cumple con US-API-002 y se ejecuta en alarmas separadas para que el
 * service worker MV3 pueda suspenderse entre intentos sin perder retries.
 */
const RETRY_DELAYS_SECONDS = [5, 15, 45]
const MAX_RETRIES = RETRY_DELAYS_SECONDS.length

const RETRY_STATE_KEY = "kairos_sync_retry_state"

interface RetryState {
  attempt: number
  scheduled_at: number
}

export function initSync(): void {
  chrome.alarms.create(SYNC_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  })

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SYNC_ALARM) {
      await syncToAPI()
      return
    }
    if (alarm.name.startsWith(SYNC_RETRY_ALARM_PREFIX)) {
      await syncToAPI()
    }
  })
}

/**
 * Hace un único intento de POST al backend.
 * - 401 ⇒ token inválido: limpia token y no reintenta.
 * - 2xx ⇒ marca éxito y limpia el buffer.
 * - Otros ⇒ devuelve error para que el caller decida reintentar.
 */
async function attemptSend(
  events: unknown[],
  token: string
): Promise<SyncResult> {
  try {
    const response = await fetch(`${API_URL}/api/v1/events/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events }),
    })

    if (response.status === 401) {
      await clearAuthToken()
      const msg = "Token inválido — sesión expirada"
      await recordSyncError(msg)
      console.error("[Kairós]", msg)
      return { success: false, sent: 0, error: msg }
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "")
      throw new Error(`HTTP ${response.status} ${text.slice(0, 120)}`)
    }

    const data = (await response.json().catch(() => ({ received: 0 }))) as {
      received?: number
    }
    const received = data.received ?? events.length
    await clearBuffer()
    await recordSyncSuccess(received)
    console.log(`[Kairós] Sync OK — ${received} eventos enviados`)
    return { success: true, sent: received }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err ?? "error desconocido")
    return { success: false, sent: 0, error: message }
  }
}

async function getRetryState(): Promise<RetryState | null> {
  const result = await chrome.storage.local.get(RETRY_STATE_KEY)
  return (result[RETRY_STATE_KEY] as RetryState | undefined) ?? null
}

async function setRetryState(state: RetryState | null): Promise<void> {
  if (state === null) {
    await chrome.storage.local.remove(RETRY_STATE_KEY)
  } else {
    await chrome.storage.local.set({ [RETRY_STATE_KEY]: state })
  }
}

async function clearScheduledRetries(): Promise<void> {
  const alarms = await chrome.alarms.getAll()
  await Promise.all(
    alarms
      .filter((a) => a.name.startsWith(SYNC_RETRY_ALARM_PREFIX))
      .map((a) => chrome.alarms.clear(a.name))
  )
}

async function scheduleRetry(attempt: number): Promise<void> {
  const delaySec = RETRY_DELAYS_SECONDS[attempt - 1] ?? 60
  await setRetryState({ attempt, scheduled_at: Date.now() })
  await chrome.alarms.create(`${SYNC_RETRY_ALARM_PREFIX}${attempt}`, {
    delayInMinutes: delaySec / 60,
  })
  console.warn(
    `[Kairós] Reintento ${attempt}/${MAX_RETRIES} programado en ${delaySec}s`
  )
}

/**
 * Punto de entrada del sync.
 * - Si hay alarms de retry encoladas: el siguiente disparo continúa el flujo.
 * - Cada llamada hace UN intento; si falla, encola el siguiente retry o se rinde.
 */
export async function syncToAPI(): Promise<SyncResult> {
  const token = await getAuthToken()
  if (!token) {
    console.log("[Kairós] Sin token — sync omitido")
    await clearScheduledRetries()
    await setRetryState(null)
    return { success: false, sent: 0, error: "no_token" }
  }

  const buffer = await getBuffer()
  if (buffer.length === 0) {
    await clearScheduledRetries()
    await setRetryState(null)
    return { success: true, sent: 0 }
  }

  const result = await attemptSend(buffer, token)
  if (result.success || result.error === "Token inválido — sesión expirada") {
    await clearScheduledRetries()
    await setRetryState(null)
    return result
  }

  const state = await getRetryState()
  const nextAttempt = (state?.attempt ?? 0) + 1

  if (nextAttempt > MAX_RETRIES) {
    console.error(
      "[Kairós] Sync agotó reintentos — eventos preservados para el próximo ciclo"
    )
    await recordSyncError(
      `Reintentos agotados: ${result.error ?? "error desconocido"}`
    )
    await clearScheduledRetries()
    await setRetryState(null)
    return result
  }

  console.error(
    `[Kairós] Sync fallido (intento ${nextAttempt}/${MAX_RETRIES + 1}): ${result.error}`
  )
  await recordSyncError(result.error ?? "fallo de red")
  await scheduleRetry(nextAttempt)
  return result
}
