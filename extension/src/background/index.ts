import { initTabTracker } from "./tab-tracker"
import { initSync, syncToAPI } from "./sync"
import {
  bufferEvent,
  clearAuthToken,
  getDailyStats,
  getSyncStatus,
  setAuthToken,
} from "../storage/buffer"
import type {
  ExternalMessage,
  RuntimeMessage,
  RuntimeResponse,
  SyncStatus,
} from "../shared/types"

initTabTracker()
initSync()

/**
 * Orígenes permitidos para `chrome.runtime.onMessageExternal` (web app).
 * En producción se agrega aquí el dominio público.
 */
const ALLOWED_EXTERNAL_ORIGINS = new Set<string>([
  "http://localhost:3000",
  "http://localhost:3001",
  "https://kairos-bienestar.vercel.app",
])

function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  )
}

chrome.runtime.onMessage.addListener(
  (rawMessage, _sender, sendResponse: (response: unknown) => void) => {
    if (!isRuntimeMessage(rawMessage)) {
      sendResponse({ error: "invalid_message" } satisfies RuntimeResponse)
      return false
    }
    const message = rawMessage

    switch (message.type) {
      case "SET_AUTH_TOKEN":
        setAuthToken(message.token)
          .then(() => sendResponse({ ok: true } satisfies RuntimeResponse))
          .catch((err) =>
            sendResponse({ error: String(err) } satisfies RuntimeResponse)
          )
        return true

      case "CLEAR_AUTH_TOKEN":
        clearAuthToken()
          .then(() => sendResponse({ ok: true } satisfies RuntimeResponse))
          .catch((err) =>
            sendResponse({ error: String(err) } satisfies RuntimeResponse)
          )
        return true

      case "SYNC_NOW":
        syncToAPI()
          .then((result) => sendResponse(result))
          .catch((err) =>
            sendResponse({
              success: false,
              sent: 0,
              error: String(err),
            })
          )
        return true

      case "GET_STATS":
        getDailyStats()
          .then((stats) => sendResponse(stats))
          .catch(() => sendResponse({}))
        return true

      case "GET_STATUS":
        getSyncStatus()
          .then((status: SyncStatus) => sendResponse(status))
          .catch(() =>
            sendResponse({
              last_sync_at: null,
              last_sync_count: 0,
              last_error: null,
              pending: 0,
            } satisfies SyncStatus)
          )
        return true

      case "SCROLL_DATA":
        bufferEvent({
          domain: message.domain,
          duration_seconds: 0,
          event_type: "scroll",
          scroll_speed: message.scroll_speed,
          timestamp: message.timestamp,
        })
          .then(() => sendResponse({ ok: true } satisfies RuntimeResponse))
          .catch((err) =>
            sendResponse({ error: String(err) } satisfies RuntimeResponse)
          )
        return true

      default: {
        const _exhaustive: never = message
        void _exhaustive
        sendResponse({ error: "unknown_type" } satisfies RuntimeResponse)
        return false
      }
    }
  }
)

chrome.runtime.onMessageExternal.addListener(
  (rawMessage, sender, sendResponse) => {
    const origin = sender.origin ?? sender.url
    if (!origin || !ALLOWED_EXTERNAL_ORIGINS.has(stripPath(origin))) {
      sendResponse({ error: "unauthorized_origin" } satisfies RuntimeResponse)
      return false
    }

    const message = rawMessage as ExternalMessage
    if (typeof message?.type !== "string") {
      sendResponse({ error: "invalid_message" } satisfies RuntimeResponse)
      return false
    }

    if (message.type === "SET_AUTH_TOKEN" && message.token) {
      setAuthToken(message.token)
        .then(() => sendResponse({ ok: true } satisfies RuntimeResponse))
        .catch((err) =>
          sendResponse({ error: String(err) } satisfies RuntimeResponse)
        )
      return true
    }

    if (message.type === "CLEAR_AUTH_TOKEN") {
      clearAuthToken()
        .then(() => sendResponse({ ok: true } satisfies RuntimeResponse))
        .catch((err) =>
          sendResponse({ error: String(err) } satisfies RuntimeResponse)
        )
      return true
    }

    if (message.type === "PING") {
      sendResponse({ ok: true } satisfies RuntimeResponse)
      return false
    }

    sendResponse({ error: "unknown_type" } satisfies RuntimeResponse)
    return false
  }
)

function stripPath(value: string): string {
  try {
    const u = new URL(value)
    return `${u.protocol}//${u.host}`
  } catch {
    return value
  }
}

console.log("[Kairós] Service worker iniciado")
