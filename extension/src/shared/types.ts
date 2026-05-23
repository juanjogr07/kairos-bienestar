/**
 * Tipos compartidos entre background, content scripts y popup.
 *
 * El contrato con `api-service` (POST /api/v1/events/batch) acepta:
 *   event_type: "tab_active" | "tab_idle" | "scroll" | "notification"
 *
 * No incluimos URLs completas — solo dominios — por privacidad.
 */

export type EventType = "tab_active" | "tab_idle" | "scroll" | "notification"

export interface StoredEvent {
  domain: string
  duration_seconds: number
  event_type: EventType
  scroll_speed?: number
  timestamp: string
}

export interface SyncResult {
  success: boolean
  sent: number
  error?: string
}

export interface SyncStatus {
  last_sync_at: string | null
  last_sync_count: number
  last_error: string | null
  pending: number
}

/**
 * Mensajes runtime entre popup ↔ background ↔ content script.
 * El discriminador es `type`.
 */
export type RuntimeMessage =
  | { type: "SET_AUTH_TOKEN"; token: string }
  | { type: "CLEAR_AUTH_TOKEN" }
  | { type: "SYNC_NOW" }
  | { type: "GET_STATS" }
  | { type: "GET_STATUS" }
  | {
      type: "SCROLL_DATA"
      domain: string
      scroll_speed: number
      timestamp: string
    }

/**
 * Mensajes externos (web app → extensión vía `externally_connectable`).
 */
export type ExternalMessage =
  | { type: "SET_AUTH_TOKEN"; token: string }
  | { type: "CLEAR_AUTH_TOKEN" }
  | { type: "PING" }

export interface RuntimeResponse {
  ok?: boolean
  error?: string
}
