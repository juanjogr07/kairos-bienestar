/**
 * Smoke test del helper `extension-bridge.ts` que vive en web/kairos-nextjs/lib/.
 *
 * Aquí lo replicamos en tests (vs importar cross-package) y verificamos
 * los 3 estados del flujo:
 *  - sin chrome.runtime → no_chrome_runtime
 *  - sin EXTENSION_ID → no_extension_id_configured
 *  - chrome + ID + token → llama sendMessage(EXTENSION_ID, ...)
 */

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback?: (response: unknown) => void
  ) => void
  lastError?: { message: string }
}

function buildBridge(extensionId: string | null) {
  return {
    async send(message: unknown): Promise<{ ok: boolean; reason?: string }> {
      const c = (globalThis as unknown as { chrome?: { runtime?: ChromeRuntime } })
        .chrome
      if (!c?.runtime) return { ok: false, reason: "no_chrome_runtime" }
      if (!extensionId) return { ok: false, reason: "no_extension_id_configured" }
      return new Promise((resolve) => {
        c.runtime!.sendMessage(extensionId, message, (response) => {
          const ok =
            response &&
            typeof response === "object" &&
            "ok" in response &&
            Boolean((response as { ok: boolean }).ok)
          resolve({ ok: Boolean(ok), reason: ok ? undefined : "no_response" })
        })
      })
    },
  }
}

describe("extension-bridge (smoke)", () => {
  const originalChrome = (globalThis as unknown as { chrome?: unknown }).chrome

  afterEach(() => {
    ;(globalThis as unknown as { chrome?: unknown }).chrome = originalChrome
  })

  it("sin chrome.runtime → no_chrome_runtime", async () => {
    ;(globalThis as unknown as { chrome?: unknown }).chrome = undefined
    const bridge = buildBridge("abc123")
    const result = await bridge.send({ type: "PING" })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("no_chrome_runtime")
  })

  it("sin EXTENSION_ID → no_extension_id_configured", async () => {
    const bridge = buildBridge(null)
    const result = await bridge.send({ type: "PING" })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("no_extension_id_configured")
  })

  it("con chrome + ID + token → llama sendMessage con extensionId", async () => {
    const sendMessage = jest.fn(
      (
        _id: string,
        _msg: unknown,
        cb?: (response: unknown) => void
      ) => cb?.({ ok: true })
    )
    ;(globalThis as unknown as { chrome: { runtime: ChromeRuntime } }).chrome = {
      runtime: { sendMessage: sendMessage as ChromeRuntime["sendMessage"] },
    }

    const bridge = buildBridge("ext-id-xyz")
    const result = await bridge.send({
      type: "SET_AUTH_TOKEN",
      token: "jwt-real",
    })

    expect(result.ok).toBe(true)
    expect(sendMessage).toHaveBeenCalledWith(
      "ext-id-xyz",
      { type: "SET_AUTH_TOKEN", token: "jwt-real" },
      expect.any(Function)
    )
  })

  it("respuesta sin ok=true → reason 'no_response'", async () => {
    ;(globalThis as unknown as { chrome: { runtime: ChromeRuntime } }).chrome = {
      runtime: {
        sendMessage: ((_id, _msg, cb) =>
          cb?.({ error: "boom" })) as ChromeRuntime["sendMessage"],
      },
    }
    const bridge = buildBridge("ext-id-xyz")
    const result = await bridge.send({ type: "PING" })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("no_response")
  })
})
