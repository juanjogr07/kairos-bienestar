import { initTabTracker } from "./tab-tracker"
import { initSync, syncToAPI } from "./sync"
import { setAuthToken, bufferEvent, getDailyStats, getAuthToken } from "../storage/buffer"

const API_URL = "http://localhost:8000"
const RISKY_DOMAINS_KEY = "kairos_risky_domains"

// Refresh the risky-domain cache from the dashboard ML results.
async function refreshRiskyDomains(): Promise<void> {
  const token = await getAuthToken()
  if (!token) return
  try {
    const res = await fetch(`${API_URL}/api/v1/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    // top_domains with high usage + triage doomscrolling/nocturnal signal → risky
    const domains: string[] = (data.top_domains ?? []).map((d: { domain: string }) => d.domain)
    await chrome.storage.local.set({ [RISKY_DOMAINS_KEY]: domains.slice(0, 10) })
  } catch {
    // best-effort; stale cache is fine
  }
}

initTabTracker()
initSync()
// Warm the risky-domain cache on startup
refreshRiskyDomains()

chrome.runtime.onMessage.addListener((message: { type: string; token?: string; scroll_speed?: number; timestamp?: string; domain?: string }, _sender, sendResponse) => {
  switch (message.type) {
    case "SET_AUTH_TOKEN":
      if (message.token) {
        setAuthToken(message.token).then(() => {
          refreshRiskyDomains()
          sendResponse({ ok: true })
        })
      }
      return true

    case "SYNC_NOW":
      syncToAPI().then((result) => {
        refreshRiskyDomains()
        sendResponse(result)
      })
      return true

    case "GET_STATS":
      getDailyStats().then((stats) => sendResponse(stats))
      return true

    case "SCROLL_DATA":
      bufferEvent({
        domain: "scroll_measurement",
        duration_seconds: 0,
        event_type: "scroll",
        scroll_speed: message.scroll_speed,
        timestamp: message.timestamp ?? new Date().toISOString(),
      }).then(() => sendResponse({ ok: true }))
      return true

    case "KAIROS_CHECK_DOMAIN":
      chrome.storage.local.get(RISKY_DOMAINS_KEY, (result) => {
        const risky: string[] = (result[RISKY_DOMAINS_KEY] as string[]) ?? []
        const domain = (message.domain ?? "").replace(/^www\./, "")
        const isRisky = risky.some((d) => domain === d || domain.endsWith(`.${d}`))
        sendResponse({ risky: isRisky, trigger_type: "risky_domain" })
      })
      return true

    default:
      sendResponse({ error: "Unknown message type" })
  }
})

chrome.runtime.onMessageExternal.addListener((message: { type: string; token?: string }, _sender, sendResponse) => {
  if (message.type === "SET_AUTH_TOKEN" && message.token) {
    setAuthToken(message.token).then(() => sendResponse({ ok: true }))
    return true
  }
})

console.log("[Kairós] Service worker iniciado")
