# Kairós MVP — Dev 3: Chrome Extension

> **Para agentic workers:** REQUIRED SUB-SKILL: Usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea.

**Goal:** Construir la extensión de Chrome de Kairós que rastrea el tiempo de uso por dominio y la velocidad de scroll, almacena los datos localmente, y los sincroniza al backend (api-service) cada 5 minutos. También incluye un popup con mini-dashboard.

**Architecture:** Manifest V3 con service worker (background), content script (scroll detection), popup React, y storage buffer local. La extensión nunca envía URLs completas, solo dominios.

**Tech Stack:** Chrome Manifest V3, TypeScript, React (popup), Webpack, chrome.tabs API, chrome.storage API

---

## Contexto del proyecto

Kairós es una plataforma de bienestar digital. Esta extensión es el "sensor" principal — captura cuánto tiempo pasa el usuario en cada sitio web y a qué velocidad hace scroll. Los datos se envían al backend en lotes.

**Tu directorio:** solo modifica `extension/`. No toques `web/`, `api-service/`, `agent-service/`, ni `playbooks/`.

**API que consumes** (contrato definido en `docs/superpowers/plans/2026-05-23-mvp-24h-master.md`):

```
POST http://localhost:8000/api/v1/events/batch
Header: Authorization: Bearer <supabase_jwt_token>
Body: {
  "events": [{ "domain": "youtube.com", "duration_seconds": 120, "event_type": "tab_active", "scroll_speed": 450.5, "timestamp": "ISO8601" }]
}
Response: { "received": 3 }
```

**Importante:** El token JWT de Supabase viene del login en la web app (`http://localhost:3000`). La extensión lee el token desde `chrome.storage.local` donde la web app lo guarda.

---

## Estructura de archivos

```
extension/
├── manifest.json              # Manifest V3 con permisos
├── package.json
├── webpack.config.js          # Build: TS → JS en dist/
├── tsconfig.json
├── src/
│   ├── background/
│   │   ├── index.ts           # Service worker principal
│   │   ├── tab-tracker.ts     # Lógica de tracking por tab
│   │   └── sync.ts            # Sync periódico al API
│   ├── content-scripts/
│   │   └── scroll-detector.ts # Mide velocidad de scroll
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx          # Entry point React
│   │   └── Popup.tsx          # UI del popup
│   └── storage/
│       └── buffer.ts          # Buffer local con chrome.storage
└── dist/                      # Output del build (auto-generado)
```

---

### Task 1: Setup del proyecto

- [ ] **Crear package.json**
```json
{
  "name": "kairos-extension",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "webpack --mode production",
    "dev": "webpack --mode development --watch"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.260",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "css-loader": "^7.1.0",
    "style-loader": "^4.0.0",
    "ts-loader": "^9.5.0",
    "typescript": "^5.4.0",
    "webpack": "^5.91.0",
    "webpack-cli": "^5.1.0"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

- [ ] **Instalar dependencias**
```bash
cd extension
npm install
```

- [ ] **Crear tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react",
    "outDir": "./dist",
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Crear webpack.config.js**
```javascript
const path = require("path")

module.exports = {
  entry: {
    background: "./src/background/index.ts",
    "content-scroll": "./src/content-scripts/scroll-detector.ts",
    popup: "./src/popup/index.tsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  resolve: { extensions: [".ts", ".tsx", ".js"] },
  module: {
    rules: [
      { test: /\.tsx?$/, use: "ts-loader", exclude: /node_modules/ },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
    ],
  },
}
```

- [ ] **Commit**
```bash
git add extension/
git commit -m "feat(ext): setup Chrome extension project with TypeScript and webpack"
```

---

### Task 2: Manifest V3

**Files:**
- Create: `extension/manifest.json`

- [ ] **Crear manifest.json**
```json
{
  "manifest_version": 3,
  "name": "Kairós — Bienestar Digital",
  "version": "0.1.0",
  "description": "Tu copiloto de bienestar digital. Rastrea tu tiempo en la web.",
  "permissions": [
    "tabs",
    "storage",
    "idle",
    "alarms"
  ],
  "host_permissions": [
    "http://localhost:8000/*",
    "<all_urls>"
  ],
  "background": {
    "service_worker": "dist/background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["dist/content-scroll.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "Kairós"
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Crear placeholder de íconos**
```bash
mkdir -p extension/icons
# Crear ícono placeholder (16x16 azul)
# Si tienes ImageMagick: convert -size 16x16 xc:#2563eb extension/icons/icon16.png
# Si no: crea un archivo PNG azul de cualquier tamaño y guárdalo como icon16.png, icon48.png, icon128.png
# Para el demo es suficiente con un cuadrado de color
```

- [ ] **Commit**
```bash
git add extension/manifest.json extension/icons/
git commit -m "feat(ext): add Manifest V3 with required permissions"
```

---

### Task 3: Buffer de almacenamiento local

**Files:**
- Create: `extension/src/storage/buffer.ts`

- [ ] **Crear src/storage/buffer.ts**
```typescript
export interface StoredEvent {
  domain: string
  duration_seconds: number
  event_type: "tab_active" | "tab_idle" | "scroll"
  scroll_speed?: number
  timestamp: string
}

const BUFFER_KEY = "kairos_event_buffer"
const TOKEN_KEY = "kairos_auth_token"

export async function bufferEvent(event: StoredEvent): Promise<void> {
  const existing = await getBuffer()
  existing.push(event)
  // Limitar el buffer a 500 eventos para no sobrepasar el storage
  const trimmed = existing.slice(-500)
  await chrome.storage.local.set({ [BUFFER_KEY]: trimmed })
}

export async function getBuffer(): Promise<StoredEvent[]> {
  const result = await chrome.storage.local.get(BUFFER_KEY)
  return result[BUFFER_KEY] ?? []
}

export async function clearBuffer(): Promise<void> {
  await chrome.storage.local.set({ [BUFFER_KEY]: [] })
}

export async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get(TOKEN_KEY)
  return result[TOKEN_KEY] ?? null
}

export async function setAuthToken(token: string): Promise<void> {
  await chrome.storage.local.set({ [TOKEN_KEY]: token })
}

export async function getDailyStats(): Promise<Record<string, number>> {
  const buffer = await getBuffer()
  const today = new Date().toISOString().split("T")[0]
  const todayEvents = buffer.filter((e) => e.timestamp.startsWith(today))

  const stats: Record<string, number> = {}
  for (const event of todayEvents) {
    stats[event.domain] = (stats[event.domain] ?? 0) + event.duration_seconds
  }
  return stats
}
```

- [ ] **Test del buffer (manual en DevTools de extension)**
```typescript
// Test en la consola del service worker:
// chrome.storage.local.get(null, console.log)
// Verificar que bufferEvent agrega eventos correctamente
```

- [ ] **Commit**
```bash
git add extension/src/storage/
git commit -m "feat(ext): add local event buffer with chrome.storage"
```

---

### Task 4: Tab tracker (tiempo por dominio)

**Files:**
- Create: `extension/src/background/tab-tracker.ts`

- [ ] **Crear src/background/tab-tracker.ts**
```typescript
import { bufferEvent, StoredEvent } from "../storage/buffer"

interface ActiveSession {
  domain: string
  startTime: number
  tabId: number
}

let currentSession: ActiveSession | null = null

function extractDomain(url: string): string | null {
  try {
    const u = new URL(url)
    if (!["http:", "https:"].includes(u.protocol)) return null
    let domain = u.hostname.toLowerCase()
    if (domain.startsWith("www.")) domain = domain.slice(4)
    return domain
  } catch {
    return null
  }
}

async function endSession(reason: string): Promise<void> {
  if (!currentSession) return

  const durationSeconds = Math.round((Date.now() - currentSession.startTime) / 1000)
  
  // Ignorar sesiones de menos de 3 segundos (accidentales)
  if (durationSeconds < 3) {
    currentSession = null
    return
  }

  const event: StoredEvent = {
    domain: currentSession.domain,
    duration_seconds: durationSeconds,
    event_type: "tab_active",
    timestamp: new Date().toISOString(),
  }

  await bufferEvent(event)
  currentSession = null
}

async function startSession(tabId: number, url: string): Promise<void> {
  await endSession("new_tab")

  const domain = extractDomain(url)
  if (!domain) return

  currentSession = {
    domain,
    startTime: Date.now(),
    tabId,
  }
}

// Escuchar cambios de tab activa
export function initTabTracker(): void {
  chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    const tab = await chrome.tabs.get(tabId)
    if (tab.url) await startSession(tabId, tab.url)
  })

  // Escuchar navegación dentro del mismo tab
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url && tab.active) {
      await startSession(tabId, tab.url)
    }
  })

  // Detectar cuando la ventana pierde el foco
  chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      await endSession("window_blur")
    } else {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (tab?.url) await startSession(tab.id!, tab.url)
    }
  })

  // Detectar idle del sistema
  chrome.idle.setDetectionInterval(60)
  chrome.idle.onStateChanged.addListener(async (state) => {
    if (state === "idle" || state === "locked") {
      await endSession("idle")
    }
  })
}
```

- [ ] **Commit**
```bash
git add extension/src/background/tab-tracker.ts
git commit -m "feat(ext): add tab time tracker with domain extraction"
```

---

### Task 5: Sincronización al API

**Files:**
- Create: `extension/src/background/sync.ts`

- [ ] **Crear src/background/sync.ts**
```typescript
import { getBuffer, clearBuffer, getAuthToken } from "../storage/buffer"

const API_URL = "http://localhost:8000"
const SYNC_ALARM = "kairos_sync"
const SYNC_INTERVAL_MINUTES = 5

export function initSync(): void {
  // Crear alarma periódica para sync cada 5 minutos
  chrome.alarms.create(SYNC_ALARM, {
    delayInMinutes: 1,
    periodInMinutes: SYNC_INTERVAL_MINUTES,
  })

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === SYNC_ALARM) {
      await syncToAPI()
    }
  })
}

export async function syncToAPI(): Promise<{ success: boolean; sent: number }> {
  const token = await getAuthToken()
  if (!token) {
    console.log("[Kairós] Sin token de auth — sync omitido")
    return { success: false, sent: 0 }
  }

  const buffer = await getBuffer()
  if (buffer.length === 0) {
    return { success: true, sent: 0 }
  }

  try {
    const response = await fetch(`${API_URL}/api/v1/events/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ events: buffer }),
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Token expirado — limpiar token
        await chrome.storage.local.remove("kairos_auth_token")
        console.warn("[Kairós] Token expirado, re-autenticación necesaria")
      }
      return { success: false, sent: 0 }
    }

    const data = await response.json()
    await clearBuffer()
    console.log(`[Kairós] Sync exitoso — ${data.received} eventos enviados`)
    return { success: true, sent: data.received }
  } catch (error) {
    // Error de red — mantener buffer para el próximo intento
    console.warn("[Kairós] Error de red en sync:", error)
    return { success: false, sent: 0 }
  }
}
```

- [ ] **Commit**
```bash
git add extension/src/background/sync.ts
git commit -m "feat(ext): add 5-minute sync to api-service with retry on network error"
```

---

### Task 6: Service worker principal

**Files:**
- Create: `extension/src/background/index.ts`

- [ ] **Crear src/background/index.ts**
```typescript
import { initTabTracker } from "./tab-tracker"
import { initSync, syncToAPI } from "./sync"
import { setAuthToken } from "../storage/buffer"

// Inicializar al cargar el service worker
initTabTracker()
initSync()

// Escuchar mensajes desde el popup y desde la web app
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "SET_AUTH_TOKEN":
      setAuthToken(message.token).then(() => sendResponse({ ok: true }))
      return true // async

    case "SYNC_NOW":
      syncToAPI().then((result) => sendResponse(result))
      return true // async

    case "GET_STATS":
      import("../storage/buffer").then(({ getDailyStats }) =>
        getDailyStats().then((stats) => sendResponse(stats))
      )
      return true // async

    default:
      sendResponse({ error: "Unknown message type" })
  }
})

// Permitir que la web app en localhost:3000 envíe el token
chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message.type === "SET_AUTH_TOKEN" && message.token) {
    setAuthToken(message.token).then(() => sendResponse({ ok: true }))
    return true
  }
})

console.log("[Kairós] Service worker iniciado")
```

- [ ] **Commit**
```bash
git add extension/src/background/index.ts
git commit -m "feat(ext): add service worker with message handler for token and sync"
```

---

### Task 7: Scroll detector (content script)

**Files:**
- Create: `extension/src/content-scripts/scroll-detector.ts`

- [ ] **Crear src/content-scripts/scroll-detector.ts**
```typescript
let lastScrollY = window.scrollY
let lastScrollTime = Date.now()
let scrollSpeeds: number[] = []
let reportInterval: ReturnType<typeof setInterval>

function measureScroll(): void {
  const now = Date.now()
  const deltaY = Math.abs(window.scrollY - lastScrollY)
  const deltaTime = (now - lastScrollTime) / 1000 // segundos

  if (deltaTime > 0 && deltaY > 0) {
    const speed = deltaY / deltaTime // px/s
    scrollSpeeds.push(speed)
    // Mantener solo los últimos 20 muestreos
    if (scrollSpeeds.length > 20) scrollSpeeds.shift()
  }

  lastScrollY = window.scrollY
  lastScrollTime = now
}

function getAverageScrollSpeed(): number {
  if (scrollSpeeds.length === 0) return 0
  return scrollSpeeds.reduce((a, b) => a + b, 0) / scrollSpeeds.length
}

function reportScrollData(): void {
  const avgSpeed = getAverageScrollSpeed()
  if (avgSpeed === 0) return

  // Enviar al service worker para incluir en el buffer
  chrome.runtime.sendMessage({
    type: "SCROLL_DATA",
    scroll_speed: Math.round(avgSpeed),
    timestamp: new Date().toISOString(),
  })

  // Reset
  scrollSpeeds = []
}

// Iniciar medición al cargar la página
window.addEventListener("scroll", measureScroll, { passive: true })

// Reportar cada 30 segundos
reportInterval = setInterval(reportScrollData, 30_000)

// Limpiar al salir de la página
window.addEventListener("beforeunload", () => {
  reportScrollData()
  clearInterval(reportInterval)
})
```

- [ ] **Manejar SCROLL_DATA en el service worker**

Editar `extension/src/background/index.ts` para agregar el case de scroll:
```typescript
// Agregar en el switch de chrome.runtime.onMessage:
case "SCROLL_DATA":
  import("../storage/buffer").then(({ bufferEvent }) => {
    bufferEvent({
      domain: "scroll_measurement",
      duration_seconds: 0,
      event_type: "scroll",
      scroll_speed: message.scroll_speed,
      timestamp: message.timestamp,
    }).then(() => sendResponse({ ok: true }))
  })
  return true
```

- [ ] **Commit**
```bash
git add extension/src/content-scripts/ extension/src/background/index.ts
git commit -m "feat(ext): add scroll speed measurement content script"
```

---

### Task 8: Popup React

**Files:**
- Create: `extension/src/popup/index.html`
- Create: `extension/src/popup/index.tsx`
- Create: `extension/src/popup/Popup.tsx`

- [ ] **Crear src/popup/index.html**
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kairós</title>
  <style>
    body { margin: 0; font-family: -apple-system, sans-serif; width: 300px; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="../dist/popup.js"></script>
</body>
</html>
```

- [ ] **Crear src/popup/index.tsx**
```typescript
import React from "react"
import { createRoot } from "react-dom/client"
import { Popup } from "./Popup"

const root = createRoot(document.getElementById("root")!)
root.render(<Popup />)
```

- [ ] **Crear src/popup/Popup.tsx**
```typescript
import React, { useEffect, useState } from "react"

interface Stats {
  [domain: string]: number
}

export function Popup() {
  const [stats, setStats] = useState<Stats>({})
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => {
    // Cargar estadísticas del día
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response: Stats) => {
      if (response) setStats(response)
    })

    // Verificar si hay token
    chrome.storage.local.get("kairos_auth_token", (result) => {
      setHasToken(!!result.kairos_auth_token)
    })

    // Cargar timestamp del último sync
    chrome.storage.local.get("kairos_last_sync", (result) => {
      if (result.kairos_last_sync) {
        const d = new Date(result.kairos_last_sync)
        setLastSync(d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }))
      }
    })
  }, [])

  async function handleSyncNow() {
    setSyncing(true)
    chrome.runtime.sendMessage({ type: "SYNC_NOW" }, () => {
      chrome.storage.local.set({ kairos_last_sync: new Date().toISOString() })
      setLastSync(new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }))
      setSyncing(false)
    })
  }

  const totalMinutes = Math.round(Object.values(stats).reduce((a, b) => a + b, 0) / 60)
  const topDomains = Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, seconds]) => ({ domain, minutes: Math.round(seconds / 60) }))
    .filter((d) => d.minutes > 0)

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "16px", color: "#2563eb" }}>Kairós</h2>
        {!hasToken && (
          <a
            href="http://localhost:3000"
            target="_blank"
            style={{ fontSize: "11px", color: "#f59e0b" }}
          >
            ⚠ Inicia sesión
          </a>
        )}
      </div>

      <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "12px", marginBottom: "12px", textAlign: "center" }}>
        <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1d4ed8" }}>{totalMinutes}</div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>minutos en pantalla hoy</div>
      </div>

      {topDomains.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Top sitios
          </div>
          {topDomains.map(({ domain, minutes }) => (
            <div key={domain} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "3px 0" }}>
              <span style={{ color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>
                {domain}
              </span>
              <span style={{ color: "#6b7280", flexShrink: 0 }}>{minutes} min</span>
            </div>
          ))}
        </div>
      )}

      {topDomains.length === 0 && (
        <p style={{ fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
          Navega un poco para ver tus estadísticas.
        </p>
      )}

      <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
          {lastSync ? `Sync: ${lastSync}` : "Sin sync aún"}
        </span>
        <button
          onClick={handleSyncNow}
          disabled={syncing || !hasToken}
          style={{
            fontSize: "12px",
            background: syncing || !hasToken ? "#e5e7eb" : "#2563eb",
            color: syncing || !hasToken ? "#9ca3af" : "white",
            border: "none",
            borderRadius: "4px",
            padding: "4px 10px",
            cursor: syncing || !hasToken ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Sincronizando..." : "Sync ahora"}
        </button>
      </div>

      <div style={{ marginTop: "8px", textAlign: "center" }}>
        <a href="http://localhost:3000/dashboard" target="_blank" style={{ fontSize: "12px", color: "#2563eb" }}>
          Ver dashboard completo →
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add extension/src/popup/
git commit -m "feat(ext): add popup with daily stats and manual sync button"
```

---

### Task 9: Build y carga en Chrome

- [ ] **Build de producción**
```bash
cd extension
npm run build
# Esperado: dist/ creado con background.js, content-scroll.js, popup.js
```

- [ ] **Cargar en Chrome (modo desarrollador)**
```
1. Abrir Chrome → chrome://extensions/
2. Activar "Modo para desarrolladores" (toggle arriba a la derecha)
3. Clic en "Cargar descomprimida"
4. Seleccionar la carpeta: extension/ (la raíz, donde está manifest.json)
5. Verificar que Kairós aparece en la lista sin errores
6. Clic en el ícono de Kairós en la barra de Chrome → popup abre
```

- [ ] **Verificar tab tracking**
```
1. Con la extensión cargada, abrir una nueva pestaña
2. Navegar a youtube.com → esperar 10 segundos
3. Navegar a instagram.com → esperar 10 segundos
4. Abrir el popup de Kairós
5. Verificar que youtube.com y instagram.com aparecen con tiempo
```

- [ ] **Verificar sync (necesita api-service corriendo)**
```
1. Asegurarse que api-service corre en localhost:8000
2. Loguearse en http://localhost:3000 (la web app)
3. En el service worker de la extensión, el token debe estar en chrome.storage
   (Para verificar: Inspect Views → service worker → Console → chrome.storage.local.get(null, console.log))
4. Clic en "Sync ahora" en el popup
5. Verificar en la consola del service worker: "[Kairós] Sync exitoso — N eventos enviados"
```

- [ ] **Build watch para desarrollo**
```bash
npm run dev
# La extensión se re-compila automáticamente con cada cambio
# En chrome://extensions/ → clic en el ícono de recarga de Kairós para recargar
```

- [ ] **Commit final**
```bash
git add extension/
git commit -m "feat(ext): extension MVP completa — tab tracking, scroll, popup, sync"
```

- [ ] **Checkpoint — postear en chat del equipo:**
```
✅ [EXTENSION] Checkpoint:
- Funciona: tab tracking, scroll detection, popup con stats, sync al API
- Para probar: cargar extension/ en chrome://extensions/ → modo desarrollador
- Necesito de otro stream: URL final del api-service cuando esté desplegado (actualizar API_URL en sync.ts)
- Token flow: usuario se loguea en web app → token guardado en chrome.storage automáticamente
  (la web app debe llamar chrome.runtime.sendMessage({type:"SET_AUTH_TOKEN", token}) después del login)
```

---

### Task 10: Integración del token desde la web app

La web app (Dev 2) debe enviar el token a la extensión después del login. Agregar esto en `web/app/login/page.tsx` después del `signIn` exitoso:

```typescript
// Después de un login exitoso en web/app/login/page.tsx
// (Dev 2 debe agregar esto en su handleSubmit)
const { data: { session } } = await supabase.auth.getSession()
if (session && window.chrome?.runtime) {
  // Enviar token a la extensión si está instalada
  const EXTENSION_ID = process.env.NEXT_PUBLIC_EXTENSION_ID || ""
  if (EXTENSION_ID) {
    try {
      window.chrome.runtime.sendMessage(EXTENSION_ID, {
        type: "SET_AUTH_TOKEN",
        token: session.access_token,
      })
    } catch {
      // extensión no instalada, ignorar
    }
  }
}
```

Agregar a `web/.env.local`:
```env
NEXT_PUBLIC_EXTENSION_ID=<chrome extension id que aparece en chrome://extensions/>
```

**El Extension ID aparece en chrome://extensions/ cuando cargas la extensión en modo desarrollador.**

- [ ] **Comunicar el Extension ID al equipo** (postear en el chat)
```
📋 [EXTENSION] Extension ID para integración con web:
ID: <pegar aquí el ID de chrome://extensions/>
```
