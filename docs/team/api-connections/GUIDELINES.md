# Lineamientos — API & Connections

## Tu dominio exclusivo

```
api-service/routers/          ← endpoints REST
api-service/auth.py           ← JWT validation
api-service/config.py         ← settings
api-service/database.py       ← LazySupabase proxy
agent-service/routers/        ← chat endpoint
agent-service/auth.py
web/lib/supabase.ts           ← cliente Supabase browser
web/lib/supabase-server.ts    ← cliente Supabase server
web/middleware.ts             ← protección de rutas
extension/src/background/sync.ts  ← sync al backend
infra/supabase/migrations/    ← nuevas migraciones SQL (coordinado con Backend-2)
```

**NUNCA toques sin coordinación:**
- `agent-service/agent/` → AI-Engineer
- `web/app/` → Frontend
- `api-service/services/` → Backend-1 y Backend-2

---

## Estrategia de ramas

```
main            ← producción
dev             ← integración
feat/api/<id>   ← features
fix/api/<id>    ← bugfixes
```

```bash
git checkout dev && git pull origin dev
git checkout -b feat/api/US-API-001-rate-limiting
```

---

## Commits

```
feat(auth): agregar refresh automático de JWT expirado
feat(events): batch insert con upsert para deduplicación
fix(middleware): corregir redirect loop en /onboarding
feat(extension): retry con backoff exponencial en sync fallido
```

---

## Responsabilidades clave

### 1. Contratos de respuesta — TÚ los defines y documentas

Cuando cambies un endpoint, actualiza el tipo en `api-service/routers/<router>.py` Y notifica a Frontend en el issue de Linear. Nunca rompas contratos existentes — añade campos opcionales, no elimines.

### 2. Auth flow

El JWT de Supabase se valida en `auth.py::get_current_user`. Si cambias la lógica de validación, afecta a **todos** los endpoints de api-service y agent-service. Documenta el cambio con tests.

### 3. Extension sync

`extension/src/background/sync.ts` llama a `POST /api/v1/events/batch`. Si cambias el schema del endpoint, también cambias el tipo en TypeScript del extension:

```typescript
// extension/src/background/sync.ts
interface EventBatch {
  events: UsageEvent[]
}
```

---

## Cómo evitar conflictos

1. **Migraciones SQL**: coordina siempre con Backend-2-Data. Tú propones la migración, Backend-2 la revisa antes de aplicar
2. **`config.py`**: si añades variables de entorno, actualiza `.env.example` en el mismo commit
3. **CORS**: si el Frontend necesita un origen nuevo, actualiza `main.py` de ambos servicios

---

## Tests obligatorios

```bash
# api-service
cd api-service && pytest tests/ -v

# Probar endpoint manualmente con httpie o curl
curl -s http://localhost:8000/health
curl -s -X POST http://localhost:8000/api/v1/events/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"events": []}'
```
