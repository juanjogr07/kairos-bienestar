# Kairós — Extensión Chrome

Chrome Extension (Manifest V3) que rastrea tiempo en pestañas, detecta velocidad
de scroll y sincroniza eventos con `api-service` cada 5 minutos.

## Stack

- Chrome Manifest V3 + Service Worker
- TypeScript estricto
- React 18 (popup)
- Webpack 5 + ts-loader + copy-webpack-plugin
- Jest 29 + jsdom (tests)

## Funcionalidades

| Componente | Descripción |
|---|---|
| **Background SW** | `chrome.alarms` cada 5 min → POST a `/api/v1/events/batch` |
| **Tab tracker** | Mide segundos por dominio. Filtra sesiones < 3s y cap a 6h. |
| **Content script** | Mide velocidad de scroll (px/s) y reporta cada 30s con el dominio real. |
| **Popup React** | Stats del día por dominio, estado de sync, errores y botón manual. |
| **Storage** | `chrome.storage.local` con cap de 500 eventos. Persiste último sync. |
| **Auth bridge** | Recibe el JWT de Supabase desde la web vía `externally_connectable`. |

## Privacidad

- Nunca se envían URLs completas, solo dominios (`hostname` sin `www.`).
- Esquemas `chrome://`, `file://`, `about:` se ignoran completamente.
- El token JWT vive solo en `chrome.storage.local`; se borra al 401.

## Confiabilidad

- **Retry exponencial 5s / 15s / 45s** (US-API-002). Si fallan los 3, los eventos
  permanecen en buffer para el siguiente ciclo (~5 min).
- **Retries vía `chrome.alarms`** (no `setTimeout`), resistentes a la suspensión
  del service worker MV3.
- **401** ⇒ limpia token y no reintenta (sesión expirada).
- **Errores se persisten** en `kairos_last_sync_error` y se muestran en el popup.

## Comandos

```bash
cd extension
npm install
npm run build      # build de producción → dist/
npm run dev        # webpack --watch
npm test           # jest (23 tests)
npm run typecheck  # tsc --noEmit
node scripts/generate-icons.js  # regenera icons/icon{16,48,128}.png
```

## Configuración build-time

```bash
# URL del backend (default: http://localhost:8000 en dev, prod URL en prod)
KAIROS_API_URL=https://api.example.com npm run build
```

## Cargar en Chrome (desarrollo)

1. `npm install && npm run build`
2. Abrir `chrome://extensions/`
3. Activar **Modo desarrollador** (toggle arriba derecha)
4. **Cargar descomprimida** → seleccionar la carpeta `extension/`
5. Copiar el **ID** que aparece debajo del nombre.
6. Pegarlo en `web/kairos-nextjs/.env.local`:
   ```
   NEXT_PUBLIC_EXTENSION_ID=abcdefghijklmnopqrstuvwxyz123456
   ```
7. Reiniciar `npm run dev` del web. Tras login, el token JWT se envía a la
   extensión automáticamente.

## Handoff de token web → extensión

1. Usuario hace login en `http://localhost:3000`.
2. `app/page.tsx` llama a `sendTokenToExtension(session.access_token)`.
3. La extensión valida el origen vía `externally_connectable` y guarda el token.
4. El próximo `chrome.alarms` de sync (cada 5 min) envía el batch al backend.

Verificable en la página `/extension` de la web: muestra el estado real de
conexión y permite reenviar el token manualmente.

## Estructura

```
extension/
├── manifest.json          # MV3 + permisos + externally_connectable
├── package.json
├── webpack.config.js      # DefinePlugin con KAIROS_API_URL
├── tsconfig.json
├── jest.config.js
├── icons/
│   ├── icon16.png         # gradiente azul→violeta con "K"
│   ├── icon48.png
│   └── icon128.png
├── scripts/
│   └── generate-icons.js  # genera PNGs sin dependencias externas
├── src/
│   ├── shared/
│   │   └── types.ts       # MessageProtocol + StoredEvent + SyncStatus
│   ├── background/
│   │   ├── index.ts       # Service worker + message router
│   │   ├── tab-tracker.ts # Tracking de sesiones por dominio
│   │   └── sync.ts        # Sync periódico + retries vía chrome.alarms
│   ├── content-scripts/
│   │   └── scroll-detector.ts  # rAF-throttled scroll + dominio real
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── Popup.tsx
│   └── storage/
│       └── buffer.ts      # Estado en chrome.storage.local
├── tests/
│   ├── setup.ts           # Mock manual de chrome.* (sin jest-chrome)
│   ├── buffer.test.ts     # 11 tests
│   ├── sync.test.ts       # 8 tests
│   └── tab-tracker.test.ts # 4 tests
└── dist/                  # Build output (ignorado en git)
```

## Tests

```bash
$ npm test
PASS tests/buffer.test.ts
PASS tests/tab-tracker.test.ts
PASS tests/sync.test.ts
Test Suites: 3 passed, 3 total
Tests:       23 passed, 23 total
```

Cubre: contrato del buffer, retries con backoff 5/15/45s, no-retry en 401,
agotamiento de reintentos, reset tras éxito, dominio normalizado.

## Verificación manual end-to-end

1. `cd api-service && uvicorn main:app --reload --port 8000`
2. `cd web/kairos-nextjs && npm run dev` (puerto 3000)
3. Cargar la extensión, copiar el ID a `.env.local` del web, reiniciar `npm run dev`.
4. Loguearse en `http://localhost:3000`.
5. Abrir popup → debe mostrar "Conectado".
6. Visitar `youtube.com`, esperar 10s, cambiar a `github.com`, esperar 10s.
7. Click "Sync ahora" en el popup → "✓ N eventos enviados".
8. Verificar en Supabase: tabla `usage_events` con `source = 'extension'`.
