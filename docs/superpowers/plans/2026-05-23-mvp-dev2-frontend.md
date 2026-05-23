# Kairós MVP — Dev 2: Frontend (web)

> **Para agentic workers:** REQUIRED SUB-SKILL: Usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea.

**Goal:** Construir la web app de Kairós en Next.js 14: onboarding con PHQ-9/GAD-7, dashboard de métricas, chat con el agente de IA, y gestión de hábitos. Autenticación via Supabase.

**Architecture:** Next.js 14 App Router, Supabase para auth, dos APIs externas (api-service en :8000, agent-service en :8001). Mientras esas APIs no estén listas, usar datos mock controlados por `NEXT_PUBLIC_USE_MOCK=true`.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, @supabase/supabase-js, @supabase/ssr

---

## Contexto del proyecto

Kairós es una plataforma de bienestar digital. Este stream (web) es la aplicación web principal. El flujo del usuario: registro → onboarding (PHQ-9 + GAD-7) → dashboard → chat con el agente → gestión de hábitos.

**Tu directorio:** solo modifica `web/`. No toques `api-service/`, `extension/`, `agent-service/`, ni `playbooks/`.

**APIs que consumes** (contratos definidos en `docs/superpowers/plans/2026-05-23-mvp-24h-master.md`):
- `api-service` en `http://localhost:8000` — eventos, encuestas, dashboard, hábitos
- `agent-service` en `http://localhost:8001` — chat con el agente

---

## Estructura de archivos

```
web/
├── app/
│   ├── layout.tsx                # Root layout con providers
│   ├── page.tsx                  # Redirect: si auth → dashboard, si no → login
│   ├── login/
│   │   └── page.tsx              # Login + registro con Supabase
│   ├── onboarding/
│   │   ├── page.tsx              # Redirect a phq9
│   │   ├── phq9/page.tsx         # Formulario PHQ-9 (9 preguntas)
│   │   └── gad7/page.tsx         # Formulario GAD-7 (7 preguntas)
│   ├── dashboard/
│   │   └── page.tsx              # Métricas: uso, hábitos, scores
│   ├── chat/
│   │   └── page.tsx              # Chat con el agente Kairós
│   └── habits/
│       └── page.tsx              # Lista + crear hábitos + marcar completados
├── components/
│   ├── nav.tsx                   # Navegación lateral
│   ├── survey-form.tsx           # Componente reutilizable para encuestas
│   ├── habit-card.tsx            # Card de hábito con racha
│   └── chat-message.tsx          # Burbuja de mensaje del chat
├── lib/
│   ├── api.ts                    # Cliente para api-service
│   ├── agent.ts                  # Cliente para agent-service
│   ├── supabase.ts               # Cliente Supabase (browser)
│   ├── supabase-server.ts        # Cliente Supabase (server)
│   └── mock-data.ts              # Datos mock para desarrollo offline
├── middleware.ts                 # Protección de rutas
├── package.json
├── tailwind.config.ts
└── next.config.ts
```

---

### Task 1: Setup de Next.js 14

- [ ] **Crear el proyecto**
```bash
cd web
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
# Responder: No a los defaults extra que no necesitamos
```

- [ ] **Instalar dependencias**
```bash
npm install @supabase/supabase-js @supabase/ssr
npx shadcn@latest init
# Cuando pregunte: Default → New York → Zinc → yes CSS variables
npx shadcn@latest add button card input label textarea badge separator
```

- [ ] **Crear .env.local**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AGENT_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK=false
```

- [ ] **Verificar que arranca**
```bash
npm run dev
# Abrir http://localhost:3000
# Esperado: página de Next.js por defecto
```

- [ ] **Commit**
```bash
git add web/
git commit -m "feat(web): setup Next.js 14 with Tailwind and shadcn/ui"
```

---

### Task 2: Supabase Auth y cliente

**Files:**
- Create: `web/lib/supabase.ts`
- Create: `web/lib/supabase-server.ts`
- Create: `web/middleware.ts`

- [ ] **Crear lib/supabase.ts (cliente browser)**
```typescript
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Crear lib/supabase-server.ts (cliente server)**
```typescript
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Crear middleware.ts**
```typescript
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login")
  const isProtected = !isAuthRoute && request.nextUrl.pathname !== "/"

  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
```

- [ ] **Commit**
```bash
git add web/lib/ web/middleware.ts
git commit -m "feat(web): add Supabase auth client and route protection middleware"
```

---

### Task 3: Login page

**Files:**
- Create: `web/app/login/page.tsx`

- [ ] **Crear app/login/page.tsx**
```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        router.push("/onboarding/phq9")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Error de autenticación")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Kairós</CardTitle>
          <CardDescription>
            {isSignUp ? "Crea tu cuenta de bienestar" : "Tu copiloto de bienestar digital"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cargando..." : isSignUp ? "Crear cuenta" : "Iniciar sesión"}
            </Button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            {isSignUp ? "¿Ya tienes cuenta?" : "¿Primera vez?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:underline"
            >
              {isSignUp ? "Inicia sesión" : "Regístrate gratis"}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add web/app/login/
git commit -m "feat(web): add login and signup page with Supabase auth"
```

---

### Task 4: Clientes de API con mocks

**Files:**
- Create: `web/lib/mock-data.ts`
- Create: `web/lib/api.ts`
- Create: `web/lib/agent.ts`

- [ ] **Crear lib/mock-data.ts**
```typescript
export const mockDashboard = {
  today_usage_min: 142,
  top_domains: [
    { domain: "youtube.com", minutes: 45 },
    { domain: "instagram.com", minutes: 32 },
    { domain: "twitter.com", minutes: 18 },
  ],
  active_habits: 2,
  total_habit_completions_today: 1,
  last_phq9_score: 9,
  last_gad7_score: 8,
  last_survey_date: "2026-05-23",
  onboarding_completed: true,
}

export const mockHabits = [
  {
    id: "mock-habit-1",
    name: "Sin teléfono la primera hora",
    playbook_slug: "nocturnal-use-pattern",
    frequency: "daily",
    active: true,
    current_streak: 3,
    completed_today: false,
  },
]

export const mockAgentReply = {
  reply: "Basándome en tus datos de hoy, veo que pasaste 45 minutos en YouTube y 32 en Instagram. Noto un patrón de uso fragmentado por la tarde — ¿has sentido dificultad para concentrarte después de revisar redes sociales?",
  playbook_activated: "doomscrolling",
  suggested_habit: "Limitar YouTube a 30 minutos por día",
}
```

- [ ] **Crear lib/api.ts**
```typescript
import { createClient } from "@/lib/supabase"
import * as mock from "@/lib/mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("No autenticado")
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function getDashboard() {
  if (USE_MOCK) return mock.mockDashboard
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/v1/dashboard`, { headers })
  if (!res.ok) throw new Error("Error al obtener dashboard")
  return res.json()
}

export async function submitSurvey(type: "phq9" | "gad7", responses: Record<string, number>, totalScore: number) {
  if (USE_MOCK) return { id: "mock-id", created_at: new Date().toISOString() }
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" }
  const res = await fetch(`${API_URL}/api/v1/surveys/${type}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ responses, total_score: totalScore }),
  })
  if (!res.ok) throw new Error("Error al guardar encuesta")
  return res.json()
}

export async function getHabits() {
  if (USE_MOCK) return mock.mockHabits
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/v1/habits`, { headers })
  if (!res.ok) throw new Error("Error al obtener hábitos")
  return res.json()
}

export async function createHabit(name: string, playbookSlug?: string) {
  if (USE_MOCK) return { ...mock.mockHabits[0], id: "new-mock", name }
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" }
  const res = await fetch(`${API_URL}/api/v1/habits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, playbook_slug: playbookSlug, frequency: "daily" }),
  })
  if (!res.ok) throw new Error("Error al crear hábito")
  return res.json()
}

export async function completeHabit(habitId: string) {
  if (USE_MOCK) return { streak: 4, message: "¡4 días seguidos! 💪" }
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/v1/habits/${habitId}/complete`, {
    method: "POST",
    headers,
  })
  if (!res.ok) throw new Error("Error al completar hábito")
  return res.json()
}
```

- [ ] **Crear lib/agent.ts**
```typescript
import { createClient } from "@/lib/supabase"
import * as mock from "@/lib/mock-data"

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8001"

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("No autenticado")
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function sendMessage(message: string) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 800)) // simular latencia
    return mock.mockAgentReply
  }
  const headers = { ...(await getAuthHeader()), "Content-Type": "application/json" }
  const res = await fetch(`${AGENT_URL}/api/v1/agent/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, context: { trigger: "user_message" } }),
  })
  if (!res.ok) throw new Error("Error al contactar al agente")
  return res.json()
}

export async function getChatHistory() {
  if (USE_MOCK) return { messages: [] }
  const headers = await getAuthHeader()
  const res = await fetch(`${AGENT_URL}/api/v1/agent/history`, { headers })
  if (!res.ok) return { messages: [] }
  return res.json()
}
```

- [ ] **Commit**
```bash
git add web/lib/
git commit -m "feat(web): add API clients with mock fallback support"
```

---

### Task 5: Onboarding PHQ-9 y GAD-7

**Files:**
- Create: `web/components/survey-form.tsx`
- Create: `web/app/onboarding/phq9/page.tsx`
- Create: `web/app/onboarding/gad7/page.tsx`

- [ ] **Crear components/survey-form.tsx**
```typescript
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const SCORE_LABELS = [
  "Para nada",
  "Varios días",
  "Más de la mitad de los días",
  "Casi todos los días",
]

interface SurveyFormProps {
  title: string
  description: string
  questions: Record<string, string>
  onComplete: (responses: Record<string, number>, total: number) => void
}

export function SurveyForm({ title, description, questions, onComplete }: SurveyFormProps) {
  const [responses, setResponses] = useState<Record<string, number>>({})

  const keys = Object.keys(questions)
  const allAnswered = keys.every((k) => responses[k] !== undefined)
  const total = Object.values(responses).reduce((a, b) => a + b, 0)

  function handleSelect(key: string, value: number) {
    setResponses((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-500 mt-1">{description}</p>
      </div>

      {keys.map((key, i) => (
        <Card key={key} className={responses[key] !== undefined ? "border-blue-200" : ""}>
          <CardContent className="pt-4">
            <p className="font-medium mb-3">
              {i + 1}. {questions[key]}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SCORE_LABELS.map((label, val) => (
                <button
                  key={val}
                  onClick={() => handleSelect(key, val)}
                  className={`p-2 text-sm rounded border transition-colors ${
                    responses[key] === val
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="font-bold">{val}</div>
                  <div className="text-xs">{label}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        className="w-full"
        disabled={!allAnswered}
        onClick={() => onComplete(responses, total)}
      >
        Continuar ({Object.keys(responses).length}/{keys.length} respondidas)
      </Button>
    </div>
  )
}
```

- [ ] **Crear app/onboarding/phq9/page.tsx**
```typescript
"use client"

import { useRouter } from "next/navigation"
import { SurveyForm } from "@/components/survey-form"
import { submitSurvey } from "@/lib/api"

const PHQ9_QUESTIONS = {
  q1: "Poco interés o placer en hacer cosas",
  q2: "Sentirse decaído/a, deprimido/a o sin esperanzas",
  q3: "Dificultad para quedarse dormido/a o dormir demasiado",
  q4: "Sentirse cansado/a o con poca energía",
  q5: "Poco apetito o comer en exceso",
  q6: "Sentirse mal consigo mismo/a — o que es un fracaso",
  q7: "Dificultad para concentrarse en cosas como leer o ver TV",
  q8: "Moverse o hablar tan lento que otros lo notan, o lo contrario",
  q9: "Pensamientos de hacerse daño o estar mejor muerto/a",
}

export default function PHQ9Page() {
  const router = useRouter()

  async function handleComplete(responses: Record<string, number>, total: number) {
    await submitSurvey("phq9", responses, total)
    router.push("/onboarding/gad7")
  }

  return (
    <SurveyForm
      title="¿Cómo te has sentido en las últimas 2 semanas?"
      description="PHQ-9 — cuestionario de salud mental. Tus respuestas son privadas y nos ayudan a personalizar tu experiencia."
      questions={PHQ9_QUESTIONS}
      onComplete={handleComplete}
    />
  )
}
```

- [ ] **Crear app/onboarding/gad7/page.tsx**
```typescript
"use client"

import { useRouter } from "next/navigation"
import { SurveyForm } from "@/components/survey-form"
import { submitSurvey } from "@/lib/api"

const GAD7_QUESTIONS = {
  q1: "Sentirse nervioso/a, ansioso/a o al límite",
  q2: "No poder dejar de preocuparse o controlar la preocupación",
  q3: "Preocuparse demasiado por cosas diferentes",
  q4: "Dificultad para relajarse",
  q5: "Estar tan inquieto/a que es difícil quedarse quieto/a",
  q6: "Irritarse o enojarse fácilmente",
  q7: "Sentir miedo como si algo terrible pudiera pasar",
}

export default function GAD7Page() {
  const router = useRouter()

  async function handleComplete(responses: Record<string, number>, total: number) {
    await submitSurvey("gad7", responses, total)
    router.push("/dashboard")
  }

  return (
    <SurveyForm
      title="Sobre tu nivel de ansiedad últimamente..."
      description="GAD-7 — evaluación de ansiedad. Casi terminamos el onboarding."
      questions={GAD7_QUESTIONS}
      onComplete={handleComplete}
    />
  )
}
```

- [ ] **Commit**
```bash
git add web/components/survey-form.tsx web/app/onboarding/
git commit -m "feat(web): add PHQ-9 and GAD-7 onboarding flow"
```

---

### Task 6: Dashboard

**Files:**
- Create: `web/components/nav.tsx`
- Create: `web/app/dashboard/page.tsx`

- [ ] **Crear components/nav.tsx**
```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Chat" },
  { href: "/habits", label: "Hábitos" },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-bold text-blue-700">Kairós</span>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm ${pathname === l.href ? "text-blue-700 font-medium" : "text-gray-600 hover:text-gray-900"}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700">
        Salir
      </button>
    </nav>
  )
}
```

- [ ] **Crear app/dashboard/page.tsx**
```typescript
import { getDashboard } from "@/lib/api"
import { Nav } from "@/components/nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function DashboardPage() {
  let data
  try {
    data = await getDashboard()
  } catch {
    data = null
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Nav />
        <div className="p-8 text-center text-gray-500">
          No se pudo cargar el dashboard. Verifica tu conexión.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Tu dashboard</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-blue-700">{data.today_usage_min}</div>
              <div className="text-sm text-gray-500">minutos en pantalla hoy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-green-600">{data.active_habits}</div>
              <div className="text-sm text-gray-500">hábitos activos</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-purple-600">{data.last_phq9_score ?? "—"}</div>
              <div className="text-sm text-gray-500">score PHQ-9</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold text-orange-500">{data.last_gad7_score ?? "—"}</div>
              <div className="text-sm text-gray-500">score GAD-7</div>
            </CardContent>
          </Card>
        </div>

        {data.top_domains.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sitios más visitados hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.top_domains.map((d: { domain: string; minutes: number }) => (
                  <div key={d.domain} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.domain}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-blue-200 rounded"
                        style={{ width: `${Math.min(d.minutes * 2, 120)}px` }}
                      />
                      <span className="text-xs text-gray-500 w-16 text-right">
                        {d.minutes} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!data.onboarding_completed && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-4">
              <p className="text-amber-800">
                Completa el onboarding para activar los insights personalizados.{" "}
                <a href="/onboarding/phq9" className="font-medium underline">Completar ahora →</a>
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add web/components/nav.tsx web/app/dashboard/
git commit -m "feat(web): add dashboard with usage metrics and survey scores"
```

---

### Task 7: Chat con el agente

**Files:**
- Create: `web/app/chat/page.tsx`

- [ ] **Crear app/chat/page.tsx**
```typescript
"use client"

import { useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendMessage } from "@/lib/agent"

interface Message {
  role: "user" | "assistant"
  content: string
  playbook?: string
}

const SUGGESTED_QUESTIONS = [
  "¿Cómo estoy usando mi tiempo digital?",
  "¿Qué hábito debería empezar?",
  "¿Cómo han estado mis niveles de ansiedad?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hola, soy Kairós. Estoy aquí para ayudarte a entender tus patrones digitales y acompañarte en tu bienestar. ¿En qué te puedo ayudar hoy?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSend(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: msg }])
    setLoading(true)

    try {
      const response = await sendMessage(msg)
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response.reply,
          playbook: response.playbook_activated,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ocurrió un error. Intenta de nuevo." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col gap-4">
        <div className="flex-1 space-y-4 overflow-y-auto min-h-0">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white shadow-sm text-gray-800 rounded-bl-none"
                }`}
              >
                {m.content}
                {m.playbook && (
                  <div className="mt-2 text-xs opacity-70">
                    Playbook activado: {m.playbook}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 text-sm shadow-sm text-gray-400">
                Kairós está pensando...
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-xs bg-white border rounded-full px-3 py-1 hover:bg-blue-50 text-gray-600"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Escribe tu mensaje..."
            disabled={loading}
          />
          <Button onClick={() => handleSend()} disabled={loading || !input.trim()}>
            Enviar
          </Button>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add web/app/chat/
git commit -m "feat(web): add chat interface with Kairos agent"
```

---

### Task 8: Hábitos

**Files:**
- Create: `web/app/habits/page.tsx`

- [ ] **Crear app/habits/page.tsx**
```typescript
"use client"

import { useEffect, useState } from "react"
import { Nav } from "@/components/nav"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { getHabits, createHabit, completeHabit } from "@/lib/api"

interface Habit {
  id: string
  name: string
  current_streak: number
  completed_today: boolean
  frequency: string
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabitName, setNewHabitName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    getHabits().then(setHabits).catch(console.error)
  }, [])

  async function handleCreate() {
    if (!newHabitName.trim()) return
    const habit = await createHabit(newHabitName)
    setHabits((prev) => [...prev, habit])
    setNewHabitName("")
  }

  async function handleComplete(habitId: string) {
    setLoading(true)
    try {
      const result = await completeHabit(habitId)
      setMessage(result.message)
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId
            ? { ...h, completed_today: true, current_streak: result.streak }
            : h
        )
      )
      setTimeout(() => setMessage(""), 3000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Mis hábitos</h1>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 text-sm">
            {message}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="Nuevo hábito (ej: Sin teléfono la primera hora)"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!newHabitName.trim()}>
            Agregar
          </Button>
        </div>

        <div className="space-y-3">
          {habits.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No tienes hábitos todavía. Agrega uno o pregúntale a Kairós cuál comenzar.
            </p>
          )}
          {habits.map((h) => (
            <Card key={h.id} className={h.completed_today ? "opacity-60" : ""}>
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{h.name}</p>
                  <p className="text-sm text-gray-500">
                    🔥 {h.current_streak} días seguidos
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={h.completed_today ? "outline" : "default"}
                  disabled={h.completed_today || loading}
                  onClick={() => handleComplete(h.id)}
                >
                  {h.completed_today ? "✓ Completado" : "Marcar hecho"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Commit**
```bash
git add web/app/habits/
git commit -m "feat(web): add habits page with streak display and completion"
```

---

### Task 9: Root page y layout final

- [ ] **Actualizar app/page.tsx**
```typescript
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
```

- [ ] **Actualizar app/layout.tsx**
```typescript
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Kairós — Bienestar Digital",
  description: "Tu copiloto de bienestar digital y físico",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

- [ ] **Verificar que el flujo completo funciona**
```bash
npm run dev
# 1. Ir a http://localhost:3000 → redirige a /login
# 2. Registrarse → redirige a /onboarding/phq9
# 3. Completar PHQ-9 → redirige a /onboarding/gad7
# 4. Completar GAD-7 → redirige a /dashboard
# 5. Dashboard muestra datos (mock o reales)
# 6. Chat funciona con respuestas mock
# 7. Hábitos: agregar, completar, ver racha
```

- [ ] **Build de producción**
```bash
npm run build
# Esperado: sin errores de TypeScript ni ESLint
```

- [ ] **Commit final**
```bash
git add web/
git commit -m "feat(web): web MVP completo — flujo E2E login → onboarding → dashboard → chat → hábitos"
```

- [ ] **Checkpoint 2 — postear en chat del equipo:**
```
✅ [FRONTEND] Checkpoint:
- Funciona: login, signup, PHQ-9, GAD-7, dashboard, chat, hábitos
- Mock activo: NEXT_PUBLIC_USE_MOCK=true (cambiar a false cuando api-service esté listo)
- Necesito de otro stream: URL del api-service y agent-service desplegados
```
