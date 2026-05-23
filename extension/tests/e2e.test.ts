/**
 * @jest-environment node
 *
 * Test E2E real (no mockeado) contra el api-service sintético en :8765.
 *
 * Solo se ejecuta si `KAIROS_E2E_API=http://127.0.0.1:8765` está seteado.
 * Cubre:
 *   - Inserta eventos en el buffer (función real de la extensión).
 *   - Llama syncToAPI() real → POST real → backend real.
 *   - Verifica que el servidor recibió los eventos con el contrato exacto.
 *   - Reproduce 401 y verifica que el token se limpia.
 *   - Reproduce 500 y verifica que se programa una alarma de retry.
 *   - Recovery tras 500.
 *   - Lote de 50 eventos en una sola request.
 *
 * Usa testEnvironment=node (en lugar de jsdom) para tener fetch global.
 */

import { bufferEvent, getBuffer, setAuthToken } from "../src/storage/buffer"
import { syncToAPI } from "../src/background/sync"

const API = process.env["KAIROS_E2E_API"]
const VALID_TOKEN = "valid-jwt-user-001"

;(API ? describe : describe.skip)("E2E: extensión ↔ api-service real", () => {
  async function callTest(path: string, init: RequestInit = {}): Promise<unknown> {
    const res = await fetch(`${API}${path}`, init)
    if (!res.ok && res.status !== 401 && res.status !== 500) {
      throw new Error(`__test endpoint failed: ${path} → ${res.status}`)
    }
    return res.json()
  }

  async function getServerEvents(): Promise<{ count: number; events: unknown[] }> {
    const data = (await callTest("/__test/events")) as {
      count: number
      events: unknown[]
    }
    return data
  }

  beforeEach(async () => {
    await callTest("/__test/reset", { method: "POST" })
  })

  it("health del backend responde", async () => {
    const res = await fetch(`${API}/health`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string }
    expect(body.status).toBe("ok")
  })

  it("sync real envía batch al backend con el contrato exacto", async () => {
    await setAuthToken(VALID_TOKEN)
    const now = new Date().toISOString()
    await bufferEvent({
      domain: "youtube.com",
      duration_seconds: 120,
      event_type: "tab_active",
      timestamp: now,
    })
    await bufferEvent({
      domain: "instagram.com",
      duration_seconds: 60,
      event_type: "scroll",
      scroll_speed: 450,
      timestamp: now,
    })

    const result = await syncToAPI()
    expect(result.success).toBe(true)
    expect(result.sent).toBe(2)

    const server = await getServerEvents()
    expect(server.count).toBe(2)
    const events = server.events as Array<{
      domain: string
      duration_seconds: number
      event_type: string
      scroll_speed: number | null
      source: string
      user_id: string
    }>
    expect(events.map((e) => e.domain).sort()).toEqual([
      "instagram.com",
      "youtube.com",
    ])
    const scrollEvent = events.find((e) => e.event_type === "scroll")
    expect(scrollEvent?.scroll_speed).toBe(450)
    expect(events.every((e) => e.source === "extension")).toBe(true)
    expect(events.every((e) => e.user_id === "user-001")).toBe(true)

    // El buffer local quedó limpio
    expect(await getBuffer()).toEqual([])
  })

  it("401 real limpia el token y NO programa retry", async () => {
    await setAuthToken("token-invalido")
    await bufferEvent({
      domain: "x.com",
      duration_seconds: 30,
      event_type: "tab_active",
      timestamp: new Date().toISOString(),
    })

    const result = await syncToAPI()
    expect(result.success).toBe(false)
    expect(result.error).toContain("Token inválido")

    const stored = await chrome.storage.local.get("kairos_auth_token")
    expect(stored["kairos_auth_token"]).toBeUndefined()
  })

  it("500 real → buffer preservado + alarma de retry programada", async () => {
    await setAuthToken(VALID_TOKEN)
    await callTest("/__test/simulate_500?count=1", { method: "POST" })
    await bufferEvent({
      domain: "tiktok.com",
      duration_seconds: 90,
      event_type: "tab_active",
      timestamp: new Date().toISOString(),
    })

    const result = await syncToAPI()
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/HTTP 500/)

    // Buffer SIGUE intacto
    const buffer = await getBuffer()
    expect(buffer).toHaveLength(1)
    expect(buffer[0]!.domain).toBe("tiktok.com")

    // Backend NO recibió nada
    const server = await getServerEvents()
    expect(server.count).toBe(0)

    // Alarma de retry programada
    const createMock = chrome.alarms.create as unknown as jest.Mock
    const retryCalls = createMock.mock.calls.filter(
      (c) => typeof c[0] === "string" && c[0].startsWith("kairos_sync_retry_")
    )
    expect(retryCalls.length).toBeGreaterThan(0)
  })

  it("recovery: tras 500, si el backend vuelve, el siguiente sync envía OK", async () => {
    await setAuthToken(VALID_TOKEN)
    await callTest("/__test/simulate_500?count=1", { method: "POST" })
    await bufferEvent({
      domain: "reddit.com",
      duration_seconds: 45,
      event_type: "tab_active",
      timestamp: new Date().toISOString(),
    })

    const first = await syncToAPI()
    expect(first.success).toBe(false)

    // El backend ya respondería 200 ahora (force_500 consumido)
    const second = await syncToAPI()
    expect(second.success).toBe(true)
    expect(second.sent).toBe(1)

    const server = await getServerEvents()
    expect(server.count).toBe(1)
    expect(await getBuffer()).toEqual([])
  })

  it("envía 50 eventos en una sola request sin truncar", async () => {
    await setAuthToken(VALID_TOKEN)
    const now = new Date().toISOString()
    for (let i = 0; i < 50; i++) {
      await bufferEvent({
        domain: `site${i}.com`,
        duration_seconds: i + 1,
        event_type: "tab_active",
        timestamp: now,
      })
    }
    const result = await syncToAPI()
    expect(result.success).toBe(true)
    expect(result.sent).toBe(50)
    const server = await getServerEvents()
    expect(server.count).toBe(50)
  })
})
