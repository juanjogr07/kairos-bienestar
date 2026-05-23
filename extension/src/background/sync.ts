import { getBuffer, clearBuffer, getAuthToken } from "../storage/buffer"

const API_URL = "http://localhost:8000"
const SYNC_ALARM = "kairos_sync"
const SYNC_INTERVAL_MINUTES = 5

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

  try {
    const response = await fetch(`${API_URL}/api/v1/events/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events: buffer }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        await chrome.storage.local.remove("kairos_auth_token")
        console.warn("[Kairós] Token expirado, re-autenticación necesaria")
      }
      return { success: false, sent: 0 }
    }

    const data = (await response.json()) as { received: number }
    await clearBuffer()
    console.log(`[Kairós] Sync exitoso — ${data.received} eventos enviados`)
    return { success: true, sent: data.received }
  } catch (error) {
    console.warn("[Kairós] Error de red en sync:", error)
    return { success: false, sent: 0 }
  }
}
