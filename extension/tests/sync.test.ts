import { API_URL, syncToAPI } from "../src/background/sync"
import {
  bufferEvent,
  getBuffer,
  getSyncStatus,
  setAuthToken,
} from "../src/storage/buffer"
import type { StoredEvent } from "../src/shared/types"

function mkEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    domain: "youtube.com",
    duration_seconds: 30,
    event_type: "tab_active",
    timestamp: "2026-05-23T10:00:00.000Z",
    ...overrides,
  }
}

interface MockResponse {
  status: number
  ok: boolean
  text: () => Promise<string>
  json: () => Promise<unknown>
}

function mkResponse(status: number, body: string | object = ""): MockResponse {
  const text = typeof body === "string" ? body : JSON.stringify(body)
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(text),
    json: () =>
      typeof body === "string"
        ? Promise.resolve(JSON.parse(text || "null"))
        : Promise.resolve(body),
  }
}

function mockFetch(
  impl: (input: string, init: RequestInit) => Promise<MockResponse>
): jest.Mock {
  const fn = jest.fn(impl) as unknown as jest.Mock
  ;(globalThis as unknown as { fetch: jest.Mock }).fetch = fn
  return fn
}

describe("syncToAPI", () => {
  let alarmsCreate: jest.Mock
  let alarmsGetAll: jest.Mock
  let alarmsClear: jest.Mock

  beforeEach(() => {
    alarmsCreate = chrome.alarms.create as unknown as jest.Mock
    alarmsGetAll = chrome.alarms.getAll as unknown as jest.Mock
    alarmsClear = chrome.alarms.clear as unknown as jest.Mock
    alarmsCreate.mockClear()
    alarmsGetAll.mockReset().mockImplementation(((cb?: (a: chrome.alarms.Alarm[]) => void) => {
      cb?.([])
      return Promise.resolve([])
    }) as unknown as () => Promise<chrome.alarms.Alarm[]>)
    alarmsClear.mockReset().mockImplementation(((_name: string, cb?: (cleared: boolean) => void) => {
      cb?.(true)
      return Promise.resolve(true)
    }) as unknown as (name: string) => Promise<boolean>)
    jest.spyOn(console, "log").mockImplementation(() => undefined)
    jest.spyOn(console, "warn").mockImplementation(() => undefined)
    jest.spyOn(console, "error").mockImplementation(() => undefined)
  })

  it("retorna error si no hay token", async () => {
    await bufferEvent(mkEvent())
    const result = await syncToAPI()
    expect(result.success).toBe(false)
    expect(result.error).toBe("no_token")
  })

  it("retorna success=true sin llamar API si el buffer está vacío", async () => {
    await setAuthToken("jwt")
    const fetchMock = mockFetch(async () => mkResponse(200, ""))
    const result = await syncToAPI()
    expect(result).toEqual({ success: true, sent: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("envía batch al endpoint correcto y limpia buffer en 200", async () => {
    await setAuthToken("jwt-token")
    await bufferEvent(mkEvent({ domain: "ig.com" }))
    await bufferEvent(mkEvent({ domain: "yt.com" }))

    const fetchMock = mockFetch(async (input, init) => {
      expect(input).toBe(`${API_URL}/api/v1/events/batch`)
      expect(init.method).toBe("POST")
      const headers = init.headers as Record<string, string>
      expect(headers["Authorization"]).toBe("Bearer jwt-token")
      expect(headers["Content-Type"]).toBe("application/json")
      const body = JSON.parse(init.body as string) as { events: StoredEvent[] }
      expect(body.events).toHaveLength(2)
      return mkResponse(200, { received: 2 })
    })

    const result = await syncToAPI()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ success: true, sent: 2 })
    expect(await getBuffer()).toEqual([])
    const status = await getSyncStatus()
    expect(status.last_sync_count).toBe(2)
    expect(status.last_error).toBeNull()
  })

  it("no reintenta en 401 y limpia el token", async () => {
    await setAuthToken("expired")
    await bufferEvent(mkEvent())
    mockFetch(async () => mkResponse(401, ""))

    const result = await syncToAPI()
    expect(result.success).toBe(false)
    expect(result.error).toContain("Token inválido")
    expect(alarmsCreate).not.toHaveBeenCalledWith(
      expect.stringMatching(/kairos_sync_retry_/),
      expect.anything()
    )
    // Token debe haberse limpiado
    const token = await chrome.storage.local.get("kairos_auth_token")
    expect(token["kairos_auth_token"]).toBeUndefined()
  })

  it("programa un retry con alarma cuando el servidor responde 500", async () => {
    await setAuthToken("jwt")
    await bufferEvent(mkEvent())
    mockFetch(async () => mkResponse(500, "boom"))

    const result = await syncToAPI()
    expect(result.success).toBe(false)
    // Buffer SE PRESERVA — esto es crítico
    expect((await getBuffer()).length).toBeGreaterThan(0)
    expect(alarmsCreate).toHaveBeenCalledWith(
      "kairos_sync_retry_1",
      expect.objectContaining({ delayInMinutes: expect.any(Number) })
    )
  })

  it("agota reintentos tras 3 fallos consecutivos", async () => {
    await setAuthToken("jwt")
    await bufferEvent(mkEvent())
    mockFetch(async () => mkResponse(503, "nope"))

    await syncToAPI() // attempt=0 → programa retry 1
    await syncToAPI() // attempt=1 → programa retry 2
    await syncToAPI() // attempt=2 → programa retry 3
    await syncToAPI() // attempt=3 → ya no programa más, rinde

    const retryCalls = alarmsCreate.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("kairos_sync_retry_")
    )
    expect(retryCalls).toHaveLength(3)
    expect(retryCalls.map((c) => c[0])).toEqual([
      "kairos_sync_retry_1",
      "kairos_sync_retry_2",
      "kairos_sync_retry_3",
    ])
    // Buffer aún preservado para el próximo ciclo periódico
    expect((await getBuffer()).length).toBeGreaterThan(0)
  })

  it("delay del retry sigue el backoff 5s/15s/45s", async () => {
    await setAuthToken("jwt")
    await bufferEvent(mkEvent())
    mockFetch(async () => mkResponse(500, "err"))

    await syncToAPI()
    await syncToAPI()
    await syncToAPI()

    const retryCreates = alarmsCreate.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("kairos_sync_retry_")
    )
    const delaysSeconds = retryCreates.map((c) =>
      Math.round((c[1] as chrome.alarms.AlarmCreateInfo).delayInMinutes! * 60)
    )
    expect(delaysSeconds).toEqual([5, 15, 45])
  })

  it("reset de estado de retry al hacer éxito", async () => {
    await setAuthToken("jwt")
    await bufferEvent(mkEvent())

    mockFetch(async () => mkResponse(500, "err"))
    await syncToAPI()
    expect(alarmsCreate).toHaveBeenCalledWith(
      "kairos_sync_retry_1",
      expect.anything()
    )

    alarmsCreate.mockClear()
    mockFetch(async () => mkResponse(200, { received: 1 }))
    const ok = await syncToAPI()
    expect(ok.success).toBe(true)

    await bufferEvent(mkEvent({ domain: "new.com" }))
    alarmsCreate.mockClear()
    mockFetch(async () => mkResponse(500, "err"))
    await syncToAPI()
    expect(alarmsCreate).toHaveBeenCalledWith(
      "kairos_sync_retry_1",
      expect.anything()
    )
  })
})
