import { bufferEvent } from "../storage/buffer"
import type { StoredEvent } from "../shared/types"

interface ActiveSession {
  domain: string
  startTime: number
  tabId: number
}

let currentSession: ActiveSession | null = null

/** Sesión mínima útil; descartamos clicks accidentales de menos de 3 segundos. */
const MIN_SESSION_SECONDS = 3
/** Cota superior contra outliers (sesiones absurdas por bug de evento). */
const MAX_SESSION_SECONDS = 6 * 60 * 60

export function extractDomain(url: string | undefined | null): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) return null
    let domain = u.hostname.toLowerCase()
    if (domain.startsWith("www.")) domain = domain.slice(4)
    return domain || null
  } catch {
    return null
  }
}

async function endSession(): Promise<void> {
  if (!currentSession) return
  const session = currentSession
  currentSession = null

  const elapsed = Math.round((Date.now() - session.startTime) / 1000)
  if (elapsed < MIN_SESSION_SECONDS) return
  const duration = Math.min(elapsed, MAX_SESSION_SECONDS)

  const event: StoredEvent = {
    domain: session.domain,
    duration_seconds: duration,
    event_type: "tab_active",
    timestamp: new Date().toISOString(),
  }

  try {
    await bufferEvent(event)
  } catch (err) {
    console.error("[Kairós] No se pudo persistir evento tab_active:", err)
  }
}

async function startSession(tabId: number, url: string): Promise<void> {
  await endSession()
  const domain = extractDomain(url)
  if (!domain) return
  currentSession = { domain, startTime: Date.now(), tabId }
}

async function safeGetTab(
  tabId: number
): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.get(tabId)
  } catch {
    // La pestaña pudo haberse cerrado entre el evento y este lookup
    return null
  }
}

async function safeQueryActiveTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    })
    return tab ?? null
  } catch {
    return null
  }
}

export function initTabTracker(): void {
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await safeGetTab(tabId)
    if (tab?.url) await startSession(tabId, tab.url)
  })

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return
    if (!tab.active || !tab.url) return
    await startSession(tabId, tab.url)
  })

  chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (currentSession?.tabId === tabId) {
      await endSession()
    }
  })

  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await endSession()
      return
    }
    const tab = await safeQueryActiveTab()
    if (tab?.url && typeof tab.id === "number") {
      await startSession(tab.id, tab.url)
    }
  })

  chrome.idle.setDetectionInterval(60)
  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === "idle" || state === "locked") {
      await endSession()
    }
  })
}
