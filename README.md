# Kairós — Copiloto de Bienestar Digital

Plataforma de bienestar que combina tracking de uso digital, encuestas PHQ-9/GAD-7, hábitos con rachas, y un agente IA con playbooks basados en evidencia.

## Streams

| Stream | Puerto | Directorio | Dev |
|---|---|---|---|
| api-service (FastAPI) | 8000 | `api-service/` | Dev 1 |
| web (Next.js 14) | 3000 | `web/` | Dev 2 |
| extension (Chrome MV3) | — | `extension/` | Dev 3 |
| agent-service (FastAPI + Claude) | 8001 | `agent-service/` | Dev 4 |

## Setup rápido

```bash
# 1. Copiar variables de entorno
cp .env.example .env
# Rellenar con valores reales de Supabase + Anthropic

# 2. Backend (Dev 1)
cd api-service && python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Agent (Dev 4)
cd agent-service && python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# 4. Frontend (Dev 2)
cd web && npm install && npm run dev

# 5. Extensión (Dev 3)
cd extension && npm install && npm run build
# Cargar en Chrome: chrome://extensions → Developer mode → Load unpacked → extension/dist/
```

## Esquema Supabase

Ejecutar `infra/supabase/migrations/001_initial_schema.sql` en el SQL Editor de Supabase.

## Regla de oro

Cada dev trabaja únicamente en su directorio. Cambios en `infra/` o archivos raíz se coordinan antes del commit.
