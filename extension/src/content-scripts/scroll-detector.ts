/**
 * Mide la velocidad de scroll en `px/segundo` y reporta promedios cada 30s.
 * No transmite URLs ni contenido — solo el dominio (hostname) y la velocidad.
 *
 * Resistente a:
 *  - Páginas sin scroll (no envía nada).
 *  - Re-inyección por SPA navigation (se reinicia el buffer).
 *  - Service worker desconectado (try/catch en sendMessage).
 */

const REPORT_INTERVAL_MS = 30_000
const MAX_SAMPLES = 30
/** Mínimo para considerar el muestreo "real" — filtra scrolls accidentales. */
const MIN_AVG_SPEED_PX_S = 50

let lastScrollY = window.scrollY
let lastScrollTime = performance.now()
let scrollSpeeds: number[] = []
let pendingRaf = false
let domain = computeDomain()

function computeDomain(): string {
  let host = window.location.hostname.toLowerCase()
  if (host.startsWith("www.")) host = host.slice(4)
  return host
}

function recordSample(): void {
  pendingRaf = false
  const now = performance.now()
  const deltaY = Math.abs(window.scrollY - lastScrollY)
  const deltaT = (now - lastScrollTime) / 1000
  if (deltaT > 0 && deltaY > 0) {
    const speed = deltaY / deltaT
    scrollSpeeds.push(speed)
    if (scrollSpeeds.length > MAX_SAMPLES) scrollSpeeds.shift()
  }
  lastScrollY = window.scrollY
  lastScrollTime = now
}

function onScroll(): void {
  if (pendingRaf) return
  pendingRaf = true
  window.requestAnimationFrame(recordSample)
}

function averageSpeed(): number {
  if (scrollSpeeds.length === 0) return 0
  return scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length
}

function reportScrollData(): void {
  const avg = averageSpeed()
  scrollSpeeds = []
  if (avg < MIN_AVG_SPEED_PX_S) return
  if (!domain) domain = computeDomain()
  if (!domain) return

  try {
    chrome.runtime.sendMessage({
      type: "SCROLL_DATA",
      domain,
      scroll_speed: Math.round(avg),
      timestamp: new Date().toISOString(),
    })
  } catch {
    // El service worker pudo estar inactivo o el contexto invalidado en
    // recarga de la extensión; no es fatal — la próxima muestra reintenta.
  }
}

window.addEventListener("scroll", onScroll, { passive: true })
const reportInterval = setInterval(reportScrollData, REPORT_INTERVAL_MS)

window.addEventListener("beforeunload", () => {
  reportScrollData()
  clearInterval(reportInterval)
})

// SPAs cambian la URL sin recargar; revalidamos el dominio periódicamente.
let lastHref = window.location.href
setInterval(() => {
  if (window.location.href !== lastHref) {
    lastHref = window.location.href
    domain = computeDomain()
    scrollSpeeds = []
  }
}, 5_000)
