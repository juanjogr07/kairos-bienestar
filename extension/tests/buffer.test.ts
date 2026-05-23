import {
  BUFFER_KEY,
  TOKEN_KEY,
  bufferEvent,
  bufferEvents,
  clearAuthToken,
  clearBuffer,
  getAuthToken,
  getBuffer,
  getDailyStats,
  getSyncStatus,
  recordSyncError,
  recordSyncSuccess,
  setAuthToken,
} from "../src/storage/buffer"
import type { StoredEvent } from "../src/shared/types"

function mkEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    domain: "youtube.com",
    duration_seconds: 60,
    event_type: "tab_active",
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe("buffer", () => {
  it("getBuffer devuelve [] si no hay nada", async () => {
    expect(await getBuffer()).toEqual([])
  })

  it("bufferEvent persiste un evento", async () => {
    await bufferEvent(mkEvent({ domain: "x.com" }))
    const buf = await getBuffer()
    expect(buf).toHaveLength(1)
    expect(buf[0]!.domain).toBe("x.com")
  })

  it("bufferEvents acumula y respeta el cap de 500", async () => {
    const events = Array.from({ length: 600 }, (_, i) =>
      mkEvent({ domain: `site${i}.com`, duration_seconds: i })
    )
    await bufferEvents(events)
    const buf = await getBuffer()
    expect(buf).toHaveLength(500)
    // Cap mantiene los más nuevos (slice(-500))
    expect(buf[0]!.domain).toBe("site100.com")
    expect(buf[buf.length - 1]!.domain).toBe("site599.com")
  })

  it("clearBuffer deja el buffer vacío", async () => {
    await bufferEvent(mkEvent())
    await clearBuffer()
    expect(await getBuffer()).toEqual([])
  })

  it("setAuthToken / getAuthToken / clearAuthToken", async () => {
    expect(await getAuthToken()).toBeNull()
    await setAuthToken("jwt-xyz")
    expect(await getAuthToken()).toBe("jwt-xyz")
    await clearAuthToken()
    expect(await getAuthToken()).toBeNull()
  })

  it("getDailyStats agrega segundos por dominio solo del día actual", async () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = "2020-01-01T12:00:00.000Z"
    await bufferEvents([
      mkEvent({ domain: "yt.com", duration_seconds: 90, timestamp: `${today}T10:00:00.000Z` }),
      mkEvent({ domain: "yt.com", duration_seconds: 30, timestamp: `${today}T11:00:00.000Z` }),
      mkEvent({ domain: "ig.com", duration_seconds: 45, timestamp: `${today}T12:00:00.000Z` }),
      mkEvent({ domain: "old.com", duration_seconds: 999, timestamp: yesterday }),
      mkEvent({
        domain: "scroll.com",
        duration_seconds: 0,
        event_type: "scroll",
        scroll_speed: 500,
        timestamp: `${today}T13:00:00.000Z`,
      }),
    ])
    const stats = await getDailyStats()
    expect(stats).toEqual({ "yt.com": 120, "ig.com": 45 })
  })

  it("getSyncStatus devuelve defaults sin datos", async () => {
    const status = await getSyncStatus()
    expect(status).toEqual({
      last_sync_at: null,
      last_sync_count: 0,
      last_error: null,
      pending: 0,
    })
  })

  it("recordSyncSuccess actualiza timestamp, count y limpia error", async () => {
    await recordSyncError("boom")
    await recordSyncSuccess(7)
    const status = await getSyncStatus()
    expect(status.last_sync_count).toBe(7)
    expect(status.last_error).toBeNull()
    expect(status.last_sync_at).not.toBeNull()
  })

  it("recordSyncError persiste mensaje", async () => {
    await recordSyncError("network")
    const status = await getSyncStatus()
    expect(status.last_error).toBe("network")
  })

  it("getSyncStatus refleja pending del buffer", async () => {
    await bufferEvents([mkEvent(), mkEvent(), mkEvent()])
    const status = await getSyncStatus()
    expect(status.pending).toBe(3)
  })

  it("expone constantes públicas correctamente", () => {
    expect(BUFFER_KEY).toBe("kairos_event_buffer")
    expect(TOKEN_KEY).toBe("kairos_auth_token")
  })
})
