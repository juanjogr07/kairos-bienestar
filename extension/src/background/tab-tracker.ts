import { bufferEvent, StoredEvent } from "../storage/buffer"

interface ActiveSession {
  domain: string
  startTime: number
  tabId: number
}

let currentSession: ActiveSession | null = null

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) return null
    let domain = u.hostname.toLowerCase()
    if (domain.startsWith("www.")) domain = domain.slice(4)
    return domain
  } catch {
    return null
  }
}

async function endSession(): Promise<void> {
  if (!currentSession) return

  const durationSeconds = Math.round((Date.now() - currentSession.startTime) / 1000)

  if (durationSeconds < 3) {
    currentSession = null
    return
  }

  const event: StoredEvent = {
    domain: currentSession.domain,
    duration_seconds: durationSeconds,
    event_type: "tab_active",
    timestamp: new Date().toISOString(),
  }

  await bufferEvent(event)
  currentSession = null
}

async function startSession(tabId: number, url: string): Promise<void> {
  await endSession()

  const domain = extractDomain(url)
  if (!domain) return

  currentSession = { domain, startTime: Date.now(), tabId }
}

export function initTabTracker(): void {
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId)
    if (tab.url) await startSession(tabId, tab.url)
  })

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.active) {
      await startSession(tabId, tab.url)
    }
  })

  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await endSession()
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url && tab.id !== undefined) await startSession(tab.id, tab.url)
    }
  })

  chrome.idle.setDetectionInterval(60)
  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === "idle" || state === "locked") {
      await endSession()
    }
  })
}
