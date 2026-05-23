# web

Frontend de Kairós. Next.js 14 App Router con autenticación Supabase, onboarding de encuestas, dashboard de bienestar, chat con el agente y seguimiento de hábitos.

## Stack

- **Next.js 14** (App Router + Server Components)
- **Tailwind CSS** + **shadcn/ui**
- **Supabase Auth** (SSR con cookies)
- **TypeScript**

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Redirect a dashboard o login |
| `/login` | Auth con Supabase (magic link / email+password) |
| `/onboarding` | Encuestas PHQ-9 y GAD-7 (primera vez) |
| `/dashboard` | Resumen del día: uso digital, hábitos, scores |
| `/chat` | Chat en tiempo real con el agente Kairós |
| `/habits` | Lista de hábitos activos y racha |

## Ejecutar

```bash
npm install
npm run dev -- --port 3001
```

Abre `http://localhost:3001`

## Variables de entorno

Crea `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AGENT_URL=http://localhost:8001

# Modo demo (sin backend real)
NEXT_PUBLIC_USE_MOCK=true
```

Con `NEXT_PUBLIC_USE_MOCK=true` todas las llamadas a la API retornan datos mock — útil para desarrollo frontend sin levantar el backend.

## Build para producción

```bash
npm run build
npm start
```

Deploy recomendado: **Vercel** (conectar el repositorio y configurar las env vars).

## Estructura relevante

```
web/
├── app/
│   ├── layout.tsx          # Root layout + Inter font
│   ├── page.tsx            # Redirect logic
│   ├── login/page.tsx      # Auth UI
│   ├── onboarding/page.tsx # PHQ-9 + GAD-7 wizard
│   ├── dashboard/page.tsx  # Métricas del día
│   ├── chat/page.tsx       # Chat con Kairós
│   └── habits/page.tsx     # Gestión de hábitos
├── lib/
│   ├── supabase-client.ts  # Cliente Supabase (browser)
│   ├── supabase-server.ts  # Cliente Supabase (server/RSC)
│   ├── api.ts              # Fetch helpers + mock fallback
│   └── mock.ts             # Datos mock para desarrollo
├── middleware.ts            # Protección de rutas
├── tailwind.config.ts
└── next.config.js
```
