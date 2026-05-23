import { initTabTracker } from "./tab-tracker"
import { initSync, syncToAPI } from "./sync"
import { setAuthToken, bufferEvent, getDailyStats } from "../storage/buffer"

initTabTracker()
initSync()

chrome.runtime.onMessage.addListener((message: { type: string; token?: string; scroll_speed?: number; timestamp?: string }, _sender, sendResponse) => {
  switch (message.type) {
    case "SET_AUTH_TOKEN":
      if (message.token) {
        setAuthToken(message.token).then(() => sendResponse({ ok: true }))
      }
      return true

    case "SYNC_NOW":
      syncToAPI().then((result) => sendResponse(result))
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
