# US-API-002 — Retry con backoff en sync de la extensión

> ⚠️ **IMPLEMENTADO — pendiente merge a dev** — Código listo en rama `feature/apiconections`. Necesita PR hacia `dev`. Ver plan maestro: `docs/plans/2026-05-23-implementacion-pendiente.md`

**Asignado a:** API & Connections  
**Prioridad:** Alta  
**Estimación:** 2 puntos  
**Rama:** `feat/api/US-API-002-extension-retry`  
**Estado:** ⚠️ Código en `feature/apiconections` — abrir PR hacia `dev`

---

## Historia de usuario

> Como usuario con conexión inestable, quiero que la extensión reintente el sync automáticamente si falla, para que no pierda datos de mi uso aunque haya un corte de red momentáneo.

---

## Archivos a modificar

| Archivo | Acción |
|---|---|
| `extension/src/background/sync.ts` | Agregar retry con backoff exponencial |
| `extension/src/storage/buffer.ts` | Agregar contador de reintentos por batch |

**NO tocar:** `api-service/`, `web/`, `agent-service/`

---

## Criterios de aceptación

- [x] Máximo 3 reintentos por sync fallido
- [x] Delay entre reintentos: 5s, 15s, 45s (backoff exponencial)
- [x] Si los 3 reintentos fallan, los eventos se quedan en buffer para el próximo ciclo (5 min)
- [x] Log en `console.error` con el error y número de reintento
- [x] Si el servidor retorna 401, NO reintentar (token inválido — no tiene sentido)

---

## Implementación sugerida

```typescript
// extension/src/background/sync.ts

const RETRY_DELAYS = [5000, 15000, 45000]

async function syncWithRetry(events: UsageEvent[], attempt = 0): Promise<void> {
  try {
    const res = await fetch(`${API_URL}/api/v1/events/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ events }),
    })

    if (res.status === 401) {
      console.error("[Kairós] Token inválido — sync cancelado")
      return
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    
    await clearBuffer()
  } catch (err) {
    if (attempt < RETRY_DELAYS.length) {
      console.error(`[Kairós] Sync fallido (intento ${attempt + 1}/3):`, err)
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
      return syncWithRetry(events, attempt + 1)
    }
    console.error("[Kairós] Sync agotó reintentos — eventos en buffer")
  }
}
```

---

## Definition of Done

- [x] Retry implementado con los 3 delays (`extension/src/background/sync.ts`)
- [x] 401 no reintenta
- [ ] **ACCIÓN REQUERIDA:** Abrir PR desde `feature/apiconections` → `dev`
- [ ] Build de extensión: `npm run build` sin errores — **pendiente verificar tras merge**
