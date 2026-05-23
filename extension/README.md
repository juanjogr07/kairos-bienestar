# extension

Chrome Extension Manifest V3 de Kairós. Trackea tiempo en tabs, detecta patrones de doomscrolling y sincroniza eventos con el backend cada 5 minutos.

## Stack

- **Chrome Manifest V3**
- **React + TypeScript** (popup)
- **Webpack** (build)

## Permisos requeridos

```json
"permissions": ["tabs", "storage", "alarms", "idle", "scripting"]
```

## Funcionalidades

| Componente | Descripción |
|---|---|
| **Background SW** | Alarma cada 5 min → sync con `api-service/api/v1/events/batch` |
| **Content Script** | Detecta scroll speed en tiempo real; identifica doomscrolling (scroll > 800px/s) |
| **Popup** | Muestra minutos de uso hoy y estado de sync |
| **Storage** | Acumula eventos localmente hasta el siguiente sync |

## Instalar en Chrome (desarrollo)

1. Build de la extensión:
   ```bash
   npm install
   npm run build
   ```

2. En Chrome: `chrome://extensions/` → activar **Modo desarrollador**

3. **Cargar descomprimida** → seleccionar la carpeta `extension/`

4. La extensión se conecta automáticamente a `localhost:3001` para leer el JWT de Supabase

## Handoff de token

La web en `localhost:3001` llama a `chrome.runtime.sendMessage` con el JWT del usuario. La extensión lo almacena en `chrome.storage.local` y lo usa en las llamadas al backend. Esto funciona porque `manifest.json` declara `externally_connectable` para `localhost:3001`.

## Build

```bash
npm run build
# Output: dist/
#   background.js
#   content-scroll.js
#   popup.js
#   popup.html
```

## Estructura

```
extension/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── index.ts      # Service worker principal
│   │   └── sync.ts       # Sync periódico a api-service
│   ├── content-scripts/
│   │   └── scroll.ts     # Detección de doomscrolling
│   ├── popup/
│   │   ├── App.tsx       # UI del popup
│   │   └── index.tsx
│   └── storage/
│       └── events.ts     # Cola local de eventos
├── dist/                  # Build output (ignorado en git)
├── webpack.config.js
└── tsconfig.json
```

## Variables de entorno

La URL del backend está hardcodeada en `src/background/sync.ts`:

```typescript
const API_URL = "http://localhost:8000"  // cambiar en producción
```

Para producción, actualizar a la URL de Railway.
