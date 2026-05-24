/**
 * Intervention overlay — shows a mindful pause before a high-risk domain loads.
 *
 * Flow:
 *  1. On document_start, send a message to the background service worker asking
 *     whether the current domain is flagged as risky by the latest triage result.
 *  2. If flagged, inject an overlay that blocks interaction for a 10-second pause.
 *  3. The user can "Continue anyway" (proceed + log acted_upon=false) or
 *     "Cerrar pestaña" (close the tab + log acted_upon=true).
 */

const OVERLAY_ID = "kairos-intervention-overlay"
const API_URL = "http://localhost:8000"

interface TriageCheck {
  risky: boolean
  trigger_type?: string
  playbook_slug?: string
  intervention_id?: string
}

async function checkDomain(domain: string): Promise<TriageCheck> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "KAIROS_CHECK_DOMAIN", domain },
      (response: TriageCheck | undefined) => {
        if (chrome.runtime.lastError || !response) {
          resolve({ risky: false })
        } else {
          resolve(response)
        }
      }
    )
  })
}

async function logShown(
  token: string,
  trigger_type: string,
  playbook_slug?: string
): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/interventions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ trigger_type, playbook_slug }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.id as string
  } catch {
    return null
  }
}

async function markActed(token: string, interventionId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/v1/interventions/${interventionId}/act`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // best-effort
  }
}

function createOverlay(secondsLeft: number): HTMLElement {
  const overlay = document.createElement("div")
  overlay.id = OVERLAY_ID
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647;
    background: rgba(10,10,20,0.92); display: flex;
    flex-direction: column; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #e8e8f0;
  `

  overlay.innerHTML = `
    <div style="max-width:360px; text-align:center; padding:32px;">
      <div style="font-size:40px; margin-bottom:16px;">⏸</div>
      <h2 style="font-size:20px; font-weight:700; margin:0 0 8px; color:#fff;">
        Pausa consciente
      </h2>
      <p style="font-size:14px; line-height:1.6; color:#a0a0c0; margin:0 0 24px;">
        Kairós notó que este sitio está asociado a patrones de estrés digital.
        Tómate 10 segundos antes de continuar.
      </p>
      <div id="kairos-timer" style="font-size:36px; font-weight:700; color:#7b6ff0; margin-bottom:24px;">
        ${secondsLeft}
      </div>
      <button id="kairos-continue" disabled
        style="
          display:block; width:100%; padding:12px; margin-bottom:10px;
          background:#7b6ff0; color:#fff; border:none; border-radius:8px;
          font-size:14px; font-weight:600; cursor:not-allowed; opacity:0.5;
        ">
        Continuar de todas formas
      </button>
      <button id="kairos-close"
        style="
          display:block; width:100%; padding:12px;
          background:transparent; color:#7b6ff0;
          border:1px solid #7b6ff0; border-radius:8px;
          font-size:14px; font-weight:600; cursor:pointer;
        ">
        Cerrar pestaña
      </button>
    </div>
  `
  return overlay
}

async function run(): Promise<void> {
  if (document.getElementById(OVERLAY_ID)) return

  const domain = location.hostname.replace(/^www\./, "")
  const check = await checkDomain(domain)
  if (!check.risky) return

  const token: string | null = await new Promise((resolve) => {
    chrome.storage.local.get("kairos_auth_token", (r) => {
      resolve((r["kairos_auth_token"] as string) ?? null)
    })
  })

  let interventionId: string | null = null
  if (token) {
    interventionId = await logShown(
      token,
      check.trigger_type ?? "risky_domain",
      check.playbook_slug
    )
  }

  let secondsLeft = 10
  const overlay = createOverlay(secondsLeft)
  document.documentElement.appendChild(overlay)

  // Prevent scroll/interaction while overlay is shown
  document.body.style.overflow = "hidden"

  const timerEl = overlay.querySelector<HTMLElement>("#kairos-timer")!
  const continueBtn = overlay.querySelector<HTMLButtonElement>("#kairos-continue")!
  const closeBtn = overlay.querySelector<HTMLButtonElement>("#kairos-close")!

  const tick = setInterval(() => {
    secondsLeft -= 1
    timerEl.textContent = String(secondsLeft)
    if (secondsLeft <= 0) {
      clearInterval(tick)
      continueBtn.disabled = false
      continueBtn.style.opacity = "1"
      continueBtn.style.cursor = "pointer"
      timerEl.textContent = "✓"
    }
  }, 1000)

  continueBtn.addEventListener("click", () => {
    clearInterval(tick)
    document.body.style.overflow = ""
    overlay.remove()
    // Not acted_upon — user continued anyway (no mark-acted call)
  })

  closeBtn.addEventListener("click", async () => {
    clearInterval(tick)
    if (token && interventionId) {
      await markActed(token, interventionId)
    }
    window.close()
  })
}

run()
