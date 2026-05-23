# Kairós — Copiloto de Bienestar Digital

> Hackathon Barranquilla IA 2026

Kairós detecta patrones de comportamiento digital (uso del navegador, encuestas de ánimo, modelos ML conductual) y los convierte en hábitos accionables, acompañados por un agente de IA con evidencia científica.

**Posicionamiento legal:** herramienta de bienestar y triaje. Nunca diagnóstico, nunca tratamiento.

---

## Arquitectura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Web (Next.js) │────▶│  api-service     │────▶│   Supabase          │
│   :3001         │     │  FastAPI :8000   │     │   PostgreSQL +      │
└─────────────────┘     └──────────────────┘     │   pgvector + Auth   │
        │                                         └─────────────────────┘
        │               ┌──────────────────┐              ▲
        └──────────────▶│  agent-service   │──────────────┘
                        │  FastAPI :8001   │
┌─────────────────┐     │  Claude Sonnet   │
│ Chrome Extension│────▶│  via OpenRouter  │
│  Manifest V3    │     └──────────────────┘
└─────────────────┘
```

| Servicio | Tecnología | Puerto | README |
|---|---|---|---|
| `web` | Next.js 14 + Tailwind + shadcn/ui | 3001 | [web/README.md](web/README.md) |
| `api-service` | FastAPI (Python) | 8000 | [api-service/README.md](api-service/README.md) |
| `agent-service` | FastAPI + Claude Sonnet via OpenRouter | 8001 | [agent-service/README.md](agent-service/README.md) |
| `extension` | Chrome MV3 + React + TypeScript | — | [extension/README.md](extension/README.md) |
| Base de datos | Supabase (PostgreSQL + pgvector + Auth) | — | — |

---

## Inicio rápido

### Prerrequisitos

- Python 3.12+
- Node.js 18+
- Cuenta en [Supabase](https://supabase.com) con proyecto creado
- API key de [OpenRouter](https://openrouter.ai) (modelo `anthropic/claude-sonnet-4-5`)

### 1. Variables de entorno

Copia `.env.example` a `.env` en la raíz y rellena los valores:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://TU_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-or-v1-...   # OpenRouter key
```

Para el frontend, crea `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AGENT_URL=http://localhost:8001
NEXT_PUBLIC_USE_MOCK=false
```

### 2. Base de datos

Aplica el schema en Supabase Dashboard → SQL Editor:

```
infra/supabase/migrations/001_initial_schema.sql   ← tablas + pgvector + RLS
infra/supabase/seeds/001_seed_playbooks.sql         ← 5 playbooks de bienestar
```

### 3. Levantar servicios

```bash
# Terminal 1 — api-service
cd api-service
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# Terminal 2 — agent-service
cd agent-service
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload

# Terminal 3 — web
cd web
npm install
npm run dev -- --port 3001
```

### 4. Embeddings de playbooks (una sola vez)

```bash
cd playbooks/scripts
python embed_playbooks.py
```

### 5. Chrome Extension

```bash
cd extension
npm install
npm run build
```

1. `chrome://extensions/` → activar **Modo desarrollador**
2. **Cargar descomprimida** → seleccionar carpeta `extension/`
3. La extensión detecta el JWT de Supabase automáticamente desde `localhost:3001`

---

## Estructura del monorepo

```
hackathon_Barranqui-IA/
├── api-service/          # REST API principal (eventos, encuestas, dashboard, hábitos)
├── agent-service/        # Agente LLM + triaje + RAG sobre playbooks
├── web/                  # Frontend Next.js 14
├── extension/            # Chrome Extension MV3 (tracking + doomscrolling)
├── playbooks/
│   ├── processed/        # Playbooks en Markdown con frontmatter YAML
│   └── scripts/          # embed_playbooks.py → pgvector
└── infra/
    └── supabase/
        ├── migrations/   # 001_initial_schema.sql
        └── seeds/        # 001_seed_playbooks.sql · 002_seed_demo_user.sql
```

---

## Flujo del usuario

1. **Registro / Login** — Supabase Auth
2. **Onboarding** — PHQ-9 (ánimo) + GAD-7 (ansiedad)
3. **Dashboard** — uso digital del día, hábitos activos, scores clínicos
4. **Chat con Kairós** — agente con acceso a tus datos + playbooks con evidencia
5. **Hábitos** — creados por el agente, racha diaria
6. **Extension** — tracking automático de tabs y detección de doomscrolling

---

## Tests

```bash
# Triage tree — no requiere credenciales reales
cd agent-service
pytest tests/ -v
# 4 passed
```

---

## Deploy

| Servicio | Plataforma recomendada |
|---|---|
| `web` | [Vercel](https://vercel.com) |
| `api-service` | [Railway](https://railway.app) |
| `agent-service` | [Railway](https://railway.app) |

---

## Licencia

MIT
