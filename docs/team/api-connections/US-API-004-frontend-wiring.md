# US-API-004 — Wiring frontend → APIs reales (dashboard, hábitos, perfil)

**Asignado a:** API & Connections  
**Prioridad:** Alta  
**Estimación:** 4 puntos  
**Rama:** `feat/api/US-API-004-frontend-wiring`

---

## Historia de usuario

> Como usuario, quiero que el dashboard, los hábitos y mi perfil muestren mis datos reales de Supabase en lugar de valores hardcodeados, para que la demo refleje el estado real de mi bienestar.

---

## Contexto técnico

Actualmente el frontend usa datos hardcodeados en todos los componentes:
- `dashboard/page.tsx`: `SITES`, `HABITS_TODAY`, scores fijos
- `habits/page.tsx`: `INITIAL` array estático
- `profile/page.tsx`: datos fijos

Esta historia crea `web/lib/api.ts` con todas las funciones de llamada a `api-service:8000` y conecta cada página.

**NO tocar:** `agent-service/`, `api-service/`, nada fuera de `web/`

---

## Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `web/kairos-nextjs/lib/api.ts` | Crear — todas las funciones de llamada a api-service |
| `web/kairos-nextjs/lib/mock-data.ts` | Crear — datos mock de calidad para desarrollo |
| `web/kairos-nextjs/app/dashboard/page.tsx` | Modificar — usar `getDashboard()` y `getWeeklyUsage()` |
| `web/kairos-nextjs/app/habits/page.tsx` | Modificar — usar `getHabits()` y `completeHabit()` |

---

## Implementación

### 1. Crear `web/kairos-nextjs/lib/api.ts`

```typescript
// web/kairos-nextjs/lib/api.ts
import { createClient } from "@/lib/supabase"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  }
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardData {
  today_usage_min: number
  top_domains: { domain: string; minutes: number }[]
  active_habits: number
  total_habit_completions_today: number
  last_phq9_score: number | null
  last_gad7_score: number | null
  last_survey_date: string | null
  onboarding_completed: boolean
}

export async function getDashboard(): Promise<DashboardData> {
  if (USE_MOCK) return MOCK_DASHBOARD
  const res = await fetch(`${API_URL}/api/v1/dashboard`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface WeeklyDay {
  day: string
  label: string
  minutes: number
}

export async function getWeeklyUsage(): Promise<WeeklyDay[]> {
  if (USE_MOCK) return MOCK_WEEKLY_USAGE
  const res = await fetch(`${API_URL}/api/v1/dashboard/weekly-usage`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ─── Habits ──────────────────────────────────────────────────────────────────

export interface Habit {
  id: string
  name: string
  playbook_slug: string | null
  frequency: "daily" | "weekly"
  active: boolean
  current_streak: number
  completed_today: boolean
}

export async function getHabits(): Promise<Habit[]> {
  if (USE_MOCK) return MOCK_HABITS
  const res = await fetch(`${API_URL}/api/v1/habits`, {
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function completeHabit(habitId: string): Promise<{ streak: number; message: string }> {
  const res = await fetch(`${API_URL}/api/v1/habits/${habitId}/complete`, {
    method: "POST",
    headers: await authHeaders(),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function createHabit(name: string, frequency: "daily" | "weekly" = "daily"): Promise<Habit> {
  const res = await fetch(`${API_URL}/api/v1/habits`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ name, frequency }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
```

### 2. Crear `web/kairos-nextjs/lib/mock-data.ts`

```typescript
// web/kairos-nextjs/lib/mock-data.ts
import type { DashboardData, WeeklyDay, Habit } from "./api"

export const MOCK_DASHBOARD: DashboardData = {
  today_usage_min: 142,
  top_domains: [
    { domain: "youtube.com", minutes: 45 },
    { domain: "instagram.com", minutes: 32 },
    { domain: "twitter.com", minutes: 18 },
    { domain: "tiktok.com", minutes: 28 },
    { domain: "reddit.com", minutes: 19 },
  ],
  active_habits: 4,
  total_habit_completions_today: 2,
  last_phq9_score: 9,
  last_gad7_score: 6,
  last_survey_date: "2026-05-23",
  onboarding_completed: true,
}

export const MOCK_WEEKLY_USAGE: WeeklyDay[] = [
  { day: "2026-05-17", label: "Sáb", minutes: 0 },
  { day: "2026-05-18", label: "Dom", minutes: 0 },
  { day: "2026-05-19", label: "Lun", minutes: 0 },
  { day: "2026-05-20", label: "Mar", minutes: 20 },
  { day: "2026-05-21", label: "Mié", minutes: 15 },
  { day: "2026-05-22", label: "Jue", minutes: 75 },
  { day: "2026-05-23", label: "Vie", minutes: 125 },
]

export const MOCK_HABITS: Habit[] = [
  { id: "1", name: "Sin teléfono la primera hora del día", playbook_slug: "attention-fragmentation", frequency: "daily", active: true, current_streak: 3, completed_today: false },
  { id: "2", name: "10 min de respiración consciente", playbook_slug: null, frequency: "daily", active: true, current_streak: 5, completed_today: true },
  { id: "3", name: "Caminar al sol 15 min", playbook_slug: null, frequency: "daily", active: true, current_streak: 1, completed_today: false },
  { id: "4", name: "Lectura sin pantallas antes de dormir", playbook_slug: null, frequency: "daily", active: true, current_streak: 2, completed_today: true },
]
```

### 3. Actualizar `dashboard/page.tsx`

```typescript
// Reemplazar SITES y HABITS_TODAY hardcodeados con estado dinámico:
const [dashboard, setDashboard] = useState<DashboardData | null>(null)
const [weeklyUsage, setWeeklyUsage] = useState<WeeklyDay[]>([])

useEffect(() => {
  Promise.all([getDashboard(), getWeeklyUsage()])
    .then(([dash, weekly]) => {
      setDashboard(dash)
      setWeeklyUsage(weekly)
    })
    .catch(console.error)
}, [])
```

Mostrar loading skeleton (spinner o `animate-pulse`) mientras `dashboard === null`.

### 4. Actualizar `habits/page.tsx`

```typescript
const [habits, setHabits] = useState<Habit[]>([])

useEffect(() => {
  getHabits().then(setHabits).catch(console.error)
}, [])

async function handleComplete(habitId: string) {
  try {
    const { streak, message } = await completeHabit(habitId)
    setHabits(h => h.map(hab =>
      hab.id === habitId ? { ...hab, completed_today: true, current_streak: streak } : hab
    ))
    // mostrar toast con `message`
  } catch {
    // mostrar toast de error
  }
}
```

---

## Variables de entorno

`web/kairos-nextjs/.env.local` (ya existe):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK=false    # true para demo sin backend
```

---

## Criterios de aceptación

- [ ] `lib/api.ts` exporta `getDashboard`, `getWeeklyUsage`, `getHabits`, `completeHabit`, `createHabit`
- [ ] `lib/mock-data.ts` exporta todos los mocks con datos coherentes con los seeds de Supabase
- [ ] `dashboard/page.tsx` usa `getDashboard()` — datos reales cuando `USE_MOCK=false`
- [ ] `habits/page.tsx` usa `getHabits()` y `completeHabit()` con la API real
- [ ] Loading skeleton en dashboard mientras carga (no pantalla en blanco)
- [ ] Con `NEXT_PUBLIC_USE_MOCK=true` funciona sin backend corriendo
- [ ] Sin errores de TypeScript (`tsc --noEmit`)

---

## Definition of Done

- [ ] `lib/api.ts` y `lib/mock-data.ts` creados
- [ ] Dashboard y Habits conectados a la API real
- [ ] `NEXT_PUBLIC_USE_MOCK=true` funciona correctamente
- [ ] PR → `dev`
- [ ] Notificar a AI Engineer (Juan Gomez) cuando esté en `dev` para que US-AI-005 pueda usar `createHabit()` de este mismo lib/api.ts
