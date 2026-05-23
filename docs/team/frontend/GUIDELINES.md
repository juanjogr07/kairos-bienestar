# Lineamientos — Frontend

## Tu dominio exclusivo

Solo tú modificas estos directorios:

```
web/app/              ← páginas (App Router)
web/components/       ← componentes reutilizables
web/lib/api.ts        ← cliente HTTP hacia api-service y agent-service
web/lib/mock-data.ts  ← datos mock para desarrollo
web/lib/agent.ts      ← cliente del agente
web/lib/utils.ts      ← helpers
web/app/globals.css   ← estilos globales
```

**NUNCA toques sin coordinación previa:**
- `web/middleware.ts` → coordinar con API-Connections
- `web/lib/supabase.ts`, `web/lib/supabase-server.ts` → coordinar con API-Connections
- `.env.local` → nunca al repositorio (está en .gitignore)

---

## Estrategia de ramas

```
main           ← producción
dev            ← integración
feat/fe/<id>   ← tus features
fix/fe/<id>    ← tus bugfixes
```

**Flujo:**
```bash
git checkout dev && git pull origin dev
git checkout -b feat/fe/US-FE-001-dashboard-charts
# ... código ...
git add web/app/dashboard/ web/components/chart.tsx
git commit -m "feat(dashboard): agregar gráfico de uso semanal"
git push origin feat/fe/US-FE-001-dashboard-charts
# PR → dev
```

**Regla crítica:** `git add` solo tus archivos. Nunca `git add .` sin revisar `git status` antes.

---

## Commits

```
feat(login): agregar soporte para magic link
feat(dashboard): gráfico de uso por hora con shadcn chart
fix(chat): corregir scroll automático al último mensaje
feat(habits): animación de completado con confetti
```

---

## Variables de entorno disponibles

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_API_URL       ← http://localhost:8000 en dev
NEXT_PUBLIC_AGENT_URL     ← http://localhost:8001 en dev
NEXT_PUBLIC_USE_MOCK      ← "true" para desarrollo sin backend
```

**Regla de mock:** Toda función en `lib/api.ts` debe tener rama de mock:

```typescript
export async function getDashboard() {
  if (USE_MOCK) return mockDashboard
  const res = await fetch(`${API_URL}/api/v1/dashboard`, { headers: authHeaders() })
  return res.json()
}
```

Nunca hagas fetch directo en componentes — siempre a través de `lib/api.ts` o `lib/agent.ts`.

---

## Contratos de API que debes consumir

### api-service `:8000`

```typescript
// GET /api/v1/dashboard
DashboardResponse {
  today_usage_min: number
  top_domains: { domain: string; minutes: number }[]
  active_habits: number
  total_habit_completions_today: number
  last_phq9_score: number | null
  last_gad7_score: number | null
  last_survey_date: string | null
  onboarding_completed: boolean
}

// GET /api/v1/habits
HabitResponse[]

// POST /api/v1/habits/:id/complete
{ success: boolean }
```

### agent-service `:8001`

```typescript
// POST /api/v1/agent/chat
{ message: string } → { reply: string; playbook_activated: string | null; suggested_habit: string | null }

// GET /api/v1/agent/history
{ messages: { role: string; content: string }[] }
```

Si el contrato cambia, los responsables (API-Connections / AI-Engineer) lo notifican en Linear antes de mergear.

---

## Cómo evitar conflictos

1. Cada página en su propio archivo — nunca dos personas en `dashboard/page.tsx` a la vez
2. Componentes nuevos van en `web/components/<nombre>.tsx` — un componente por archivo
3. Si necesitas cambiar `middleware.ts`: coordina con API-Connections
4. Para estilos: usa clases Tailwind, no CSS inline ni archivos `.css` nuevos sin coordinar

---

## Tests visuales

Antes de PR, navega manualmente:
- `localhost:3001/login` → `localhost:3001/onboarding` → `localhost:3001/dashboard` → `localhost:3001/chat` → `localhost:3001/habits`
- Verifica en móvil (DevTools → viewport 390px)
- Sin errores en consola del browser
