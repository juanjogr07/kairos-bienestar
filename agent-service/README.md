# agent-service

Agente de IA de Kairós. Orquesta Claude Sonnet (via OpenRouter) con un loop de tool_use, triaje de bienestar y RAG sobre playbooks con evidencia científica.

## Stack

- **FastAPI** (Python 3.12)
- **OpenAI SDK** apuntando a **OpenRouter** (`anthropic/claude-sonnet-4-5`)
- **sentence-transformers** — embeddings `all-MiniLM-L6-v2` para RAG
- **Supabase pgvector** — búsqueda semántica sobre playbook_chunks

## Arquitectura interna

```
POST /api/v1/agent/chat
        │
        ▼
   run_triage(user_id)          ← PHQ-9, GAD-7, ML scores
        │
        ▼
   chat(user_id, message)
        │
        ▼
   OpenRouter (Claude Sonnet)
   ┌─── tool_use loop ──────────────────────────┐
   │  get_usage_summary(user_id, days)           │
   │  get_survey_scores(user_id)                 │
   │  get_ml_scores(user_id)                     │
   │  search_playbooks(query)  ← pgvector RAG    │
   └────────────────────────────────────────────┘
        │
        ▼
   {"reply": "...", "playbook_activated": "..."}
```

## Árbol de triaje

| Nivel | Condición | Playbook |
|---|---|---|
| `crisis` | PHQ-9 ≥ 15 ó GAD-7 ≥ 15 | crisis-escalation → Línea 106 |
| `mood` | 5 ≤ PHQ-9 < 15 ó 5 ≤ GAD-7 < 15 | low-mood-indicators |
| `digital` | doomscrolling_score > 0.70 | doomscrolling |
| `digital` | nocturnal_pattern_score > 0.65 | nocturnal-use-pattern |
| `digital` | attention_fragmentation_score > 0.60 | attention-fragmentation |
| `default` | Sin señales | — |

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/agent/chat` | Enviar mensaje al agente |
| `POST` | `/api/v1/agent/trigger` | Trigger automático (reporte semanal) |
| `GET` | `/api/v1/agent/history` | Historial de mensajes (in-memory) |

## Estructura

```
agent-service/
├── main.py
├── auth.py
├── config.py
├── database.py           # LazySupabase proxy
├── agent/
│   ├── orchestrator.py   # Loop tool_use principal
│   ├── memory.py         # Historial in-memory por user_id
│   └── tools/
│       ├── get_usage_summary.py
│       ├── get_survey_scores.py
│       ├── get_ml_scores.py
│       └── search_playbooks.py
├── triage/
│   └── tree.py           # Árbol de decisión de bienestar
├── rag/
│   ├── embedder.py       # sentence-transformers
│   └── retriever.py      # match_playbook_chunks (pgvector RPC)
├── routers/
│   └── chat.py
└── tests/
    ├── conftest.py        # Stubs de supabase/openai para tests sin credenciales
    └── test_triage.py     # 4 tests del árbol de triaje
```

## Ejecutar

```bash
pip install -r requirements.txt

# Requiere ../.env con ANTHROPIC_API_KEY (OpenRouter key sk-or-v1-...)
uvicorn main:app --port 8001 --reload
```

Docs: `http://localhost:8001/docs`

## Tests

No requieren credenciales reales (conftest.py stubbea todo):

```bash
pytest tests/ -v
# 4 passed in ~0.1s
```

## Variables de entorno requeridas

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY
ANTHROPIC_API_KEY        # OpenRouter key: sk-or-v1-...
```
