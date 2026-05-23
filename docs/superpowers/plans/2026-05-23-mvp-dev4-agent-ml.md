# Kairós MVP — Dev 4: Agente + ML + RAG

> **Para agentic workers:** REQUIRED SUB-SKILL: Usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea.

**Goal:** Construir el agent-service de Kairós: un agente Claude Sonnet 4.6 que usa modelos ML como herramientas, recupera playbooks via RAG (pgvector), ejecuta el árbol de triaje, y responde al usuario con insights personalizados y basados en evidencia.

**Architecture:** FastAPI con un endpoint de chat, Claude Sonnet 4.6 como orquestador via tool_use, 4 playbooks embebidos en pgvector (Supabase), árbol de triaje por reglas explícitas, y dos modelos ML de bootstrap (Isolation Forest + XGBoost simplificado).

**Tech Stack:** Python 3.11+, FastAPI, anthropic SDK, langchain-community, sentence-transformers, scikit-learn, supabase-py

---

## Contexto del proyecto

Kairós es una plataforma de bienestar digital. Este stream (agent-service) es el cerebro — recibe mensajes del usuario desde la web app, consulta los datos de comportamiento y encuestas del usuario, y responde con insights narrados. El agente **nunca inventa consejo de salud mental** — solo recupera playbooks pre-validados via RAG.

**Tu directorio:** solo modifica `agent-service/` y `playbooks/`. No toques `web/`, `api-service/`, `extension/`.

**Supabase:** mismo proyecto que el Dev 1. Las credenciales las comparte Dev 1 al inicio. La tabla `playbook_chunks` (para RAG) y `usage_events`, `survey_responses`, `ml_results` ya están creadas por Dev 1.

**API que expones** (contrato definido en `docs/superpowers/plans/2026-05-23-mvp-24h-master.md`):
```
POST http://localhost:8001/api/v1/agent/chat
POST http://localhost:8001/api/v1/agent/trigger
GET  http://localhost:8001/api/v1/agent/history
```

---

## Estructura de archivos

```
agent-service/
├── main.py                       # FastAPI app, CORS, routers
├── config.py                     # Settings desde env vars
├── auth.py                       # Middleware JWT Supabase (igual que api-service)
├── database.py                   # Cliente Supabase
├── requirements.txt
├── routers/
│   ├── __init__.py
│   └── chat.py                   # POST /chat, POST /trigger, GET /history
├── agent/
│   ├── __init__.py
│   ├── orchestrator.py           # Claude con tool_use
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── get_ml_scores.py      # Lee ml_results de Supabase
│   │   ├── get_survey_scores.py  # Lee survey_responses de Supabase
│   │   ├── get_usage_summary.py  # Calcula resumen de uso_events
│   │   └── search_playbooks.py   # RAG: búsqueda semántica en pgvector
│   └── memory.py                 # Historial de conversación por usuario (en-memory para MVP)
├── rag/
│   ├── __init__.py
│   ├── embedder.py               # Modelo 10: all-MiniLM-L6-v2
│   └── retriever.py              # Búsqueda en pgvector
├── triage/
│   ├── __init__.py
│   └── tree.py                   # Árbol de triaje — reglas explícitas
└── ml/
    ├── __init__.py
    ├── bootstrap.py              # Entrena modelos con StudentLife (si disponible)
    └── inference.py              # Isolation Forest + XGBoost simplificado

playbooks/
├── scripts/
│   └── embed_playbooks.py        # Embebe playbooks en pgvector
└── processed/
    ├── attention-fragmentation.md
    ├── doomscrolling.md
    ├── nocturnal-use-pattern.md
    ├── low-mood-indicators.md
    └── crisis-escalation.md
```

---

### Task 1: Setup del proyecto

**Files:**
- Create: `agent-service/requirements.txt`
- Create: `agent-service/config.py`
- Create: `agent-service/database.py`
- Create: `agent-service/auth.py`

- [ ] **Crear requirements.txt**
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
anthropic==0.40.0
supabase==2.9.0
sentence-transformers==3.0.0
scikit-learn==1.5.0
pandas==2.2.0
numpy==1.26.0
python-jose[cryptography]==3.3.0
pydantic==2.7.0
pydantic-settings==2.3.0
python-dotenv==1.0.0
```

- [ ] **Instalar dependencias**
```bash
cd agent-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# sentence-transformers descarga ~90MB en primer uso
```

- [ ] **Crear config.py**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    anthropic_api_key: str

    class Config:
        env_file = "../.env"

settings = Settings()
```

- [ ] **Crear database.py**
```python
from supabase import create_client, Client
from config import settings

def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)

supabase: Client = get_supabase()
```

- [ ] **Crear auth.py** (idéntico al de api-service)
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import supabase

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
        return str(response.user.id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No autenticado")
```

- [ ] **Crear main.py**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat

app = FastAPI(title="Kairós Agent Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "agent-service"}
```

- [ ] **Verificar que arranca**
```bash
uvicorn main:app --reload --port 8001
curl http://localhost:8001/health
# Esperado: {"status":"ok","service":"agent-service"}
```

- [ ] **Commit**
```bash
git add agent-service/
git commit -m "feat(agent): setup agent-service FastAPI project"
```

---

### Task 2: Playbooks base de conocimiento

**Files:**
- Create: `playbooks/processed/attention-fragmentation.md`
- Create: `playbooks/processed/doomscrolling.md`
- Create: `playbooks/processed/nocturnal-use-pattern.md`
- Create: `playbooks/processed/low-mood-indicators.md`
- Create: `playbooks/processed/crisis-escalation.md`

- [ ] **Crear playbooks/processed/attention-fragmentation.md**
```markdown
---
slug: attention-fragmentation
signal_type: attention_fragmentation
activates_when: attention_fragmentation_score > 0.60
crisis_escalation: false
---

## Señales que activan este playbook
- Más de 40 cambios de app/tab por hora
- Sesiones promedio menores a 3 minutos
- Bounce rate (sesiones < 30s) mayor al 30%

## Qué dice la evidencia
La fragmentación de la atención digital está asociada con reducción del rendimiento cognitivo y mayor dificultad para sostener el estado de "flow" (Ophir et al., 2009, PNAS). El concepto de "atención parcial continua" (Stone, 2009) describe el estado de dispersión que genera el multitasking digital constante.

## Hábitos recomendados (por esfuerzo/impacto)
1. **Bloqueo de tiempo** (bajo esfuerzo, alto impacto): designar bloques de 25-50 minutos sin revisar redes sociales ni email. Técnica Pomodoro aplicada al uso digital.
2. **Auditoría de notificaciones** (bajo esfuerzo, medio impacto): desactivar todas las notificaciones excepto llamadas y mensajes directos por 7 días.
3. **Teléfono fuera del escritorio** (medio esfuerzo, alto impacto): durante bloques de trabajo, el teléfono físicamente fuera del alcance (no solo en silencio).

## Intervenciones en el momento
- Antes de cambiar de pestaña: pausa de 3 segundos con la pregunta "¿esto puede esperar 20 minutos?"
- Overlay amigable al detectar más de 10 cambios en 15 minutos.

## Cuándo recomendar ayuda profesional
Si la dificultad de concentración es persistente (más de 3 semanas) y afecta trabajo o relaciones personales, considerar evaluación profesional para descartar ADHD u otras condiciones.

## Lenguaje aprobado
✅ "Noto que cambias de pestaña con frecuencia. Muchas personas encuentran útil reservar bloques sin interrupciones digitales."
✅ "Tus sesiones promedio son cortas. Explorar técnicas de enfoque podría ayudarte."
❌ "Tienes déficit de atención" / "Podrías tener ADHD"
```

- [ ] **Crear playbooks/processed/doomscrolling.md**
```markdown
---
slug: doomscrolling
signal_type: doomscrolling
activates_when: doomscrolling_score > 0.70
crisis_escalation: false
---

## Señales que activan este playbook
- Velocidad de scroll superior a 600 px/s sostenida
- Sesiones largas (> 20 min) en redes sociales con alta velocidad de scroll
- Uso nocturno (después de las 22h) en redes sociales

## Qué dice la evidencia
El doomscrolling —consumo compulsivo de contenido negativo— se asocia con aumento de ansiedad y deterioro del sueño (Bayer et al., 2022, Health Communication). El diseño de las plataformas de scroll infinito explota los mecanismos de refuerzo variable del cerebro (Montag et al., 2019).

## Hábitos recomendados
1. **Límite de tiempo explícito** (bajo esfuerzo): establecer un límite diario concreto (ej: 30 minutos en Instagram). Usar el recordatorio de Screen Time o la extensión.
2. **Sustitución de actividad** (medio esfuerzo): identificar qué necesidad cubre el doomscrolling (aburrimiento, ansiedad, procrastinación) y tener una actividad alternativa lista.
3. **Modo gris por la noche** (bajo esfuerzo): activar escala de grises en el teléfono después de las 21h. Reduce el atractivo visual del contenido.

## Intervenciones en el momento
- Overlay suave al detectar > 15 minutos de scroll continuo: "Llevas 15 minutos scrolleando. ¿Quieres continuar o tomar un descanso?"
- Pregunta reflexiva: "¿Cómo te sientes ahora comparado con antes de abrir esta app?"

## Cuándo recomendar ayuda profesional
Si la sensación de no poder parar genera angustia significativa o interfiere con actividades importantes.

## Lenguaje aprobado
✅ "Noto que pasas tiempo en scroll rápido. ¿Cómo te sientes usualmente después de esas sesiones?"
✅ "Muchas personas encuentran que poner un límite explícito les ayuda a sentirse más en control."
❌ "Eres adicto/a a las redes sociales."
```

- [ ] **Crear playbooks/processed/nocturnal-use-pattern.md**
```markdown
---
slug: nocturnal-use-pattern
signal_type: nocturnal_pattern
activates_when: nocturnal_pattern_score > 0.65
crisis_escalation: false
---

## Señales que activan este playbook
- Más del 25% del uso digital total ocurre entre las 22h y las 7h
- Sesiones activas en redes sociales o contenido estimulante después de las 23h

## Qué dice la evidencia
La exposición a pantallas antes de dormir suprime la melatonina por la luz azul y activa el sistema de alerta cognitiva, retrasando el inicio del sueño (Chang et al., 2015, PNAS). El uso nocturno de redes sociales se asocia con peor calidad de sueño y mayor fatiga diurna (Scott et al., 2019).

## Hábitos recomendados
1. **Ventana sin pantallas** (medio esfuerzo, alto impacto): apagar todas las pantallas 45 minutos antes de dormir. Reemplazar con lectura física, podcast o conversación.
2. **Cargador fuera del cuarto** (bajo esfuerzo, alto impacto): cargar el teléfono fuera de la habitación. Usar despertador independiente si es necesario.
3. **Filtro de luz azul automático** (bajo esfuerzo): activar Night Shift (iOS) o Night Light (Android) desde las 20h.

## Intervenciones en el momento
- Notificación suave a las 22h: "Buenas noches. ¿Quieres activar el modo nocturno de Kairós?"

## Cuándo recomendar ayuda profesional
Si el insomnio persiste más de 3 semanas a pesar de cambios de higiene de sueño.

## Lenguaje aprobado
✅ "Noto que usas el teléfono bastante tarde. El sueño tiene un impacto enorme en el bienestar — ¿has notado diferencia en cómo te sientes cuando duermes bien?"
❌ "Tienes un trastorno de sueño."
```

- [ ] **Crear playbooks/processed/low-mood-indicators.md**
```markdown
---
slug: low-mood-indicators
signal_type: low_mood
activates_when: phq9_score >= 5
crisis_escalation: false
---

## Señales que activan este playbook
- PHQ-9 score entre 5 y 14 (síntomas leves a moderados)
- No activa con score < 5 (mínimo) ni >= 15 (escalamiento de crisis)

## Qué dice la evidencia
Los síntomas leves-moderados de PHQ-9 son responsivos a intervenciones conductuales como activación conductual, ejercicio regular y técnicas de mindfulness (Cuijpers et al., 2019, revisión Cochrane). La higiene digital puede ser un factor modulador.

## Hábitos recomendados
1. **Actividad física breve** (bajo umbral): 10 minutos de caminata diaria. La evidencia es robusta para el efecto del ejercicio en el estado de ánimo (Kvam et al., 2016).
2. **Conexión social activa**: un mensaje o llamada breve a alguien de confianza por día.
3. **Reducción de contenido negativo**: limitar consumo de noticias a 10 minutos/día durante 2 semanas.

## Intervenciones en el momento
- Sugerir actividades de activación conductual cuando se detecta uso pasivo prolongado.

## Cuándo recomendar ayuda profesional
SIEMPRE mencionar la opción profesional con scores >= 5. Hacer obligatorio con >= 10. Ver playbook crisis-escalation para >= 15.

## Lenguaje aprobado
✅ "Tus respuestas muestran algunas señales que vale la pena atender. Esto es muy común y hay cosas concretas que puedes probar. Si sientes que necesitas más apoyo, hablar con un profesional siempre es una buena opción."
❌ "Tienes depresión." / "Estás deprimido/a."
```

- [ ] **Crear playbooks/processed/crisis-escalation.md**
```markdown
---
slug: crisis-escalation
signal_type: crisis
activates_when: phq9_score >= 15 OR gad7_score >= 15
crisis_escalation: true
---

## ⚠️ PLAYBOOK DE CRISIS — SOLO MODIFICAR CON REVISIÓN CLÍNICA

## Señales que activan este playbook
- PHQ-9 score >= 15 (síntomas moderadamente severos a severos)
- GAD-7 score >= 15 (ansiedad severa)
- Cualquier respuesta positiva a la pregunta 9 del PHQ-9

## Respuesta del sistema
Este playbook SIEMPRE deriva a recursos de ayuda profesional inmediata. No incluye recomendaciones de hábitos ni intervenciones conductuales. La única acción es derivar.

## Recursos de ayuda (Colombia)
- **Línea 106** — Salud mental 24h (gratuita)
- **Cruz Roja Colombia** — 132
- **Línea de la vida** — 01 8000 113 113

## Lenguaje aprobado (único mensaje permitido)
"Noto que estás pasando por un momento difícil. Lo que sientes es importante y merece atención real. Te animo a contactar a alguien de confianza o a una línea de apoyo ahora mismo. No tienes que atravesar esto solo/a.

📞 Línea 106 — Salud mental, gratuita, 24 horas."

## PROHIBIDO en este playbook
❌ Sugerir hábitos o ejercicios de bienestar
❌ Minimizar lo que siente el usuario
❌ Diagnosticar
❌ Reemplazar la derivación por cualquier otra respuesta
```

- [ ] **Commit**
```bash
git add playbooks/
git commit -m "feat(agent): add 5 evidence-based playbooks for RAG"
```

---

### Task 3: RAG — Embedder y retriever

**Files:**
- Create: `agent-service/rag/embedder.py`
- Create: `agent-service/rag/retriever.py`
- Create: `playbooks/scripts/embed_playbooks.py`

- [ ] **Crear agent-service/rag/embedder.py**
```python
from sentence_transformers import SentenceTransformer
from functools import lru_cache

MODEL_NAME = "all-MiniLM-L6-v2"

@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)

def embed_text(text: str) -> list[float]:
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()

def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    vectors = model.encode(texts, normalize_embeddings=True)
    return vectors.tolist()
```

- [ ] **Test del embedder**
```python
# agent-service/tests/test_embedder.py
from rag.embedder import embed_text

def test_embed_text_returns_384_dims():
    vec = embed_text("doomscrolling anxiety intervention")
    assert len(vec) == 384
    assert all(isinstance(v, float) for v in vec)

def test_same_text_same_vector():
    v1 = embed_text("test text")
    v2 = embed_text("test text")
    assert v1 == v2
```

```bash
cd agent-service
pytest tests/test_embedder.py -v
# Nota: primera vez descarga el modelo (~90MB). Puede tardar 1-2 min.
```

- [ ] **Crear agent-service/rag/retriever.py**
```python
from rag.embedder import embed_text
from database import supabase
from typing import List

def search_playbooks(query: str, limit: int = 3) -> List[dict]:
    query_vector = embed_text(query)

    # Búsqueda por similitud coseno en pgvector
    result = supabase.rpc(
        "match_playbook_chunks",
        {
            "query_embedding": query_vector,
            "match_threshold": 0.4,
            "match_count": limit,
        }
    ).execute()

    return result.data or []
```

- [ ] **Crear la función RPC en Supabase**

Ejecutar en Supabase SQL Editor:
```sql
-- Función para búsqueda semántica de playbooks
CREATE OR REPLACE FUNCTION match_playbook_chunks(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.4,
  match_count int DEFAULT 3
)
RETURNS TABLE (
  id uuid,
  playbook_id uuid,
  chunk_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pc.id,
    pc.playbook_id,
    pc.chunk_text,
    1 - (pc.embedding <=> query_embedding) AS similarity
  FROM playbook_chunks pc
  WHERE 1 - (pc.embedding <=> query_embedding) > match_threshold
  ORDER BY pc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

- [ ] **Crear playbooks/scripts/embed_playbooks.py**
```python
#!/usr/bin/env python3
"""
Embebe todos los playbooks procesados en Supabase pgvector.
Ejecutar una sola vez (o al agregar nuevos playbooks).

Uso: python embed_playbooks.py
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../agent-service"))

import re
from pathlib import Path
from database import supabase
from rag.embedder import embed_texts

PLAYBOOKS_DIR = Path(__file__).parent.parent / "processed"
CHUNK_SIZE = 400  # caracteres por chunk

def extract_frontmatter(content: str) -> tuple[dict, str]:
    """Extrae el frontmatter YAML del contenido Markdown."""
    if not content.startswith("---"):
        return {}, content
    
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    
    frontmatter_text = content[3:end].strip()
    body = content[end + 3:].strip()
    
    meta = {}
    for line in frontmatter_text.split("\n"):
        if ": " in line:
            key, value = line.split(": ", 1)
            meta[key.strip()] = value.strip()
    
    return meta, body

def chunk_text(text: str, chunk_size: int = CHUNK_SIZE) -> list[str]:
    """Divide el texto en chunks por párrafos."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    current = ""
    
    for para in paragraphs:
        if len(current) + len(para) < chunk_size:
            current += "\n\n" + para if current else para
        else:
            if current:
                chunks.append(current)
            current = para
    
    if current:
        chunks.append(current)
    
    return chunks or [text[:chunk_size]]

def embed_all_playbooks():
    print("🔍 Buscando playbooks...")
    playbook_files = list(PLAYBOOKS_DIR.glob("*.md"))
    print(f"   Encontrados: {len(playbook_files)} archivos\n")

    for filepath in playbook_files:
        content = filepath.read_text(encoding="utf-8")
        meta, body = extract_frontmatter(content)
        
        slug = meta.get("slug", filepath.stem)
        title = slug.replace("-", " ").title()
        
        print(f"📄 Procesando: {slug}")
        
        # Upsert el playbook
        playbook_res = supabase.table("playbooks").upsert({
            "slug": slug,
            "title": title,
            "signal_type": meta.get("signal_type"),
            "content": body,
            "activates_when": meta.get("activates_when"),
            "crisis_escalation": meta.get("crisis_escalation", "false").lower() == "true",
        }, on_conflict="slug").execute()
        
        playbook_id = playbook_res.data[0]["id"]
        
        # Eliminar chunks anteriores de este playbook
        supabase.table("playbook_chunks").delete().eq("playbook_id", playbook_id).execute()
        
        # Crear nuevos chunks con embeddings
        chunks = chunk_text(body)
        embeddings = embed_texts(chunks)
        
        rows = [
            {
                "playbook_id": playbook_id,
                "chunk_text": chunk,
                "embedding": embedding,
                "chunk_index": i,
            }
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        
        supabase.table("playbook_chunks").insert(rows).execute()
        print(f"   ✅ {len(chunks)} chunks embebidos\n")

    print("✨ Todos los playbooks embebidos exitosamente.")

if __name__ == "__main__":
    embed_all_playbooks()
```

- [ ] **Ejecutar el script de embedding**
```bash
cd playbooks/scripts
python embed_playbooks.py
# Primera vez: descarga modelo ~90MB, luego procesa
# Esperado: 5 playbooks × N chunks cada uno
# Verificar en Supabase: tabla playbook_chunks debe tener filas con embedding no nulo
```

- [ ] **Commit**
```bash
git add agent-service/rag/ playbooks/scripts/
git commit -m "feat(agent): add RAG embedder, retriever, and playbook embedding script"
```

---

### Task 4: Herramientas del agente

**Files:**
- Create: `agent-service/agent/tools/get_usage_summary.py`
- Create: `agent-service/agent/tools/get_survey_scores.py`
- Create: `agent-service/agent/tools/get_ml_scores.py`
- Create: `agent-service/agent/tools/search_playbooks.py`

- [ ] **Crear agent/tools/get_usage_summary.py**
```python
from database import supabase
from datetime import date, timedelta

def get_usage_summary(user_id: str, days: int = 7) -> dict:
    """Devuelve resumen de uso de los últimos N días."""
    since = (date.today() - timedelta(days=days)).isoformat()

    result = supabase.table("usage_events")\
        .select("domain, duration_seconds, timestamp")\
        .eq("user_id", user_id)\
        .gte("timestamp", since)\
        .execute()

    domain_totals: dict[str, int] = {}
    daily_totals: dict[str, int] = {}

    for ev in result.data:
        domain = ev["domain"]
        seconds = ev["duration_seconds"]
        day = ev["timestamp"][:10]

        domain_totals[domain] = domain_totals.get(domain, 0) + seconds
        daily_totals[day] = daily_totals.get(day, 0) + seconds

    top_domains = sorted(
        [{"domain": d, "minutes": s // 60} for d, s in domain_totals.items()],
        key=lambda x: x["minutes"],
        reverse=True,
    )[:5]

    today_seconds = daily_totals.get(date.today().isoformat(), 0)
    avg_daily = sum(daily_totals.values()) // max(len(daily_totals), 1)

    return {
        "top_domains": top_domains,
        "today_minutes": today_seconds // 60,
        "avg_daily_minutes": avg_daily // 60,
        "days_with_data": len(daily_totals),
    }
```

- [ ] **Crear agent/tools/get_survey_scores.py**
```python
from database import supabase

def get_survey_scores(user_id: str) -> dict:
    """Devuelve los últimos scores PHQ-9 y GAD-7 del usuario."""
    
    def latest_score(survey_type: str) -> float | None:
        res = supabase.table("survey_responses")\
            .select("total_score, created_at")\
            .eq("user_id", user_id)\
            .eq("survey_type", survey_type)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        return res.data[0]["total_score"] if res.data else None

    phq9 = latest_score("phq9")
    gad7 = latest_score("gad7")

    def interpret_phq9(score: float | None) -> str:
        if score is None: return "sin datos"
        if score < 5: return "mínimo"
        if score < 10: return "leve"
        if score < 15: return "moderado"
        if score < 20: return "moderadamente severo"
        return "severo"

    def interpret_gad7(score: float | None) -> str:
        if score is None: return "sin datos"
        if score < 5: return "mínimo"
        if score < 10: return "leve"
        if score < 15: return "moderado"
        return "severo"

    return {
        "phq9_score": phq9,
        "phq9_interpretation": interpret_phq9(phq9),
        "gad7_score": gad7,
        "gad7_interpretation": interpret_gad7(gad7),
        "crisis_flag": (phq9 is not None and phq9 >= 15) or (gad7 is not None and gad7 >= 15),
    }
```

- [ ] **Crear agent/tools/get_ml_scores.py**
```python
from database import supabase

def get_ml_scores(user_id: str) -> dict:
    """Devuelve los últimos resultados de los modelos ML."""
    
    def latest_result(model_type: str) -> dict | None:
        res = supabase.table("ml_results")\
            .select("result")\
            .eq("user_id", user_id)\
            .eq("model_type", model_type)\
            .order("computed_at", desc=True)\
            .limit(1)\
            .execute()
        return res.data[0]["result"] if res.data else None

    xgb = latest_result("xgboost")
    iso = latest_result("isolation_forest")

    # Defaults si no hay modelos aún (MVP cold start)
    return {
        "attention_fragmentation_score": xgb.get("attention_fragmentation_score", 0.0) if xgb else 0.0,
        "nocturnal_pattern_score": xgb.get("nocturnal_pattern_score", 0.0) if xgb else 0.0,
        "doomscrolling_score": xgb.get("doomscrolling_score", 0.0) if xgb else 0.0,
        "anomaly_flag": iso.get("anomaly_flag", False) if iso else False,
        "anomaly_severity": iso.get("severity", 0.0) if iso else 0.0,
        "has_ml_data": xgb is not None,
    }
```

- [ ] **Crear agent/tools/search_playbooks.py**
```python
from rag.retriever import search_playbooks as rag_search
from database import supabase

def search_playbooks(query: str, limit: int = 2) -> list[dict]:
    """Busca playbooks relevantes via RAG (pgvector)."""
    results = rag_search(query, limit=limit)
    
    if not results:
        return []
    
    # Obtener el contenido completo de los playbooks encontrados
    playbook_ids = list({r["playbook_id"] for r in results})
    playbooks_res = supabase.table("playbooks")\
        .select("slug, title, content, activates_when, crisis_escalation")\
        .in_("id", playbook_ids)\
        .execute()
    
    return [
        {
            "slug": p["slug"],
            "title": p["title"],
            "content": p["content"][:800],  # Limitar para no saturar el contexto
            "crisis_escalation": p["crisis_escalation"],
        }
        for p in playbooks_res.data
    ]
```

- [ ] **Commit**
```bash
git add agent-service/agent/tools/
git commit -m "feat(agent): add 4 Claude tool implementations (usage, surveys, ML, playbooks)"
```

---

### Task 5: Árbol de triaje

**Files:**
- Create: `agent-service/triage/tree.py`

- [ ] **Crear triage/tree.py**
```python
from agent.tools.get_survey_scores import get_survey_scores
from agent.tools.get_ml_scores import get_ml_scores
from agent.tools.get_usage_summary import get_usage_summary

def run_triage(user_id: str) -> dict:
    """
    Árbol de triaje por reglas explícitas.
    Devuelve el playbook activado y el contexto relevante para el agente.
    """
    surveys = get_survey_scores(user_id)
    ml = get_ml_scores(user_id)
    usage = get_usage_summary(user_id, days=7)

    # NIVEL 1 — CRISIS (acción inmediata, sin excepción)
    if surveys.get("crisis_flag"):
        return {
            "level": "crisis",
            "playbook_slug": "crisis-escalation",
            "reason": "PHQ-9 o GAD-7 en rango severo",
            "context": {"surveys": surveys},
        }

    # NIVEL 2 — SEÑALES DE ÁNIMO
    phq9 = surveys.get("phq9_score")
    gad7 = surveys.get("gad7_score")

    if phq9 is not None and 5 <= phq9 < 15:
        return {
            "level": "mood",
            "playbook_slug": "low-mood-indicators",
            "reason": f"PHQ-9 = {phq9} ({surveys['phq9_interpretation']})",
            "context": {"surveys": surveys, "usage": usage},
        }

    if gad7 is not None and 5 <= gad7 < 15:
        return {
            "level": "mood",
            "playbook_slug": "low-mood-indicators",
            "reason": f"GAD-7 = {gad7} ({surveys['gad7_interpretation']})",
            "context": {"surveys": surveys, "usage": usage},
        }

    # NIVEL 3 — PATRONES DIGITALES
    if ml.get("doomscrolling_score", 0) > 0.70:
        return {
            "level": "digital",
            "playbook_slug": "doomscrolling",
            "reason": f"doomscrolling_score = {ml['doomscrolling_score']:.2f}",
            "context": {"ml": ml, "usage": usage},
        }

    if ml.get("nocturnal_pattern_score", 0) > 0.65:
        return {
            "level": "digital",
            "playbook_slug": "nocturnal-use-pattern",
            "reason": f"nocturnal_pattern_score = {ml['nocturnal_pattern_score']:.2f}",
            "context": {"ml": ml, "usage": usage},
        }

    if ml.get("attention_fragmentation_score", 0) > 0.60:
        return {
            "level": "digital",
            "playbook_slug": "attention-fragmentation",
            "reason": f"attention_fragmentation_score = {ml['attention_fragmentation_score']:.2f}",
            "context": {"ml": ml, "usage": usage},
        }

    # DEFAULT — sin señales claras
    return {
        "level": "default",
        "playbook_slug": None,
        "reason": "Sin señales de triaje activas",
        "context": {"surveys": surveys, "ml": ml, "usage": usage},
    }
```

- [ ] **Test del árbol de triaje**
```python
# agent-service/tests/test_triage.py
from unittest.mock import patch

@patch("triage.tree.get_survey_scores")
@patch("triage.tree.get_ml_scores")
@patch("triage.tree.get_usage_summary")
def test_crisis_escalation(mock_usage, mock_ml, mock_surveys):
    mock_surveys.return_value = {"phq9_score": 18, "phq9_interpretation": "severo", "gad7_score": 8, "gad7_interpretation": "leve", "crisis_flag": True}
    mock_ml.return_value = {"attention_fragmentation_score": 0.3, "nocturnal_pattern_score": 0.4, "doomscrolling_score": 0.5, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": False}
    mock_usage.return_value = {"top_domains": [], "today_minutes": 0, "avg_daily_minutes": 0, "days_with_data": 0}
    
    from triage.tree import run_triage
    result = run_triage("user-1")
    
    assert result["level"] == "crisis"
    assert result["playbook_slug"] == "crisis-escalation"

@patch("triage.tree.get_survey_scores")
@patch("triage.tree.get_ml_scores")
@patch("triage.tree.get_usage_summary")
def test_doomscrolling_signal(mock_usage, mock_ml, mock_surveys):
    mock_surveys.return_value = {"phq9_score": 3, "phq9_interpretation": "mínimo", "gad7_score": 3, "gad7_interpretation": "mínimo", "crisis_flag": False}
    mock_ml.return_value = {"attention_fragmentation_score": 0.3, "nocturnal_pattern_score": 0.4, "doomscrolling_score": 0.85, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": True}
    mock_usage.return_value = {"top_domains": [], "today_minutes": 120, "avg_daily_minutes": 90, "days_with_data": 7}
    
    from triage.tree import run_triage
    result = run_triage("user-1")
    
    assert result["level"] == "digital"
    assert result["playbook_slug"] == "doomscrolling"
```

```bash
pytest tests/test_triage.py -v
```

- [ ] **Commit**
```bash
git add agent-service/triage/ agent-service/tests/
git commit -m "feat(agent): add explicit triage tree with crisis escalation"
```

---

### Task 6: Orquestador Claude con tool_use

**Files:**
- Create: `agent-service/agent/memory.py`
- Create: `agent-service/agent/orchestrator.py`

- [ ] **Crear agent/memory.py**
```python
from collections import defaultdict
from typing import List

# En-memory para MVP. En producción: persistir en Supabase.
_histories: dict[str, List[dict]] = defaultdict(list)

MAX_HISTORY = 10  # mensajes por usuario

def get_history(user_id: str) -> List[dict]:
    return _histories[user_id][-MAX_HISTORY:]

def add_message(user_id: str, role: str, content: str) -> None:
    _histories[user_id].append({"role": role, "content": content})

def clear_history(user_id: str) -> None:
    _histories[user_id] = []
```

- [ ] **Crear agent/orchestrator.py**
```python
import anthropic
import json
from config import settings
from triage.tree import run_triage
from agent.tools.get_usage_summary import get_usage_summary
from agent.tools.get_survey_scores import get_survey_scores
from agent.tools.get_ml_scores import get_ml_scores
from agent.tools.search_playbooks import search_playbooks
from agent import memory as mem

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

TOOLS = [
    {
        "name": "get_usage_summary",
        "description": "Obtiene resumen del uso digital del usuario en los últimos N días: top dominios, minutos totales, promedio diario.",
        "input_schema": {
            "type": "object",
            "properties": {
                "user_id": {"type": "string"},
                "days": {"type": "integer", "default": 7},
            },
            "required": ["user_id"],
        },
    },
    {
        "name": "get_survey_scores",
        "description": "Obtiene los últimos scores de PHQ-9 (ánimo) y GAD-7 (ansiedad) del usuario, con interpretación en texto.",
        "input_schema": {
            "type": "object",
            "properties": {"user_id": {"type": "string"}},
            "required": ["user_id"],
        },
    },
    {
        "name": "get_ml_scores",
        "description": "Obtiene los scores de los modelos ML: attention_fragmentation, nocturnal_pattern, doomscrolling, anomaly_flag.",
        "input_schema": {
            "type": "object",
            "properties": {"user_id": {"type": "string"}},
            "required": ["user_id"],
        },
    },
    {
        "name": "search_playbooks",
        "description": "Busca playbooks de bienestar basados en evidencia científica usando búsqueda semántica. Usar SIEMPRE antes de dar recomendaciones.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Descripción del patrón o señal detectada"},
                "limit": {"type": "integer", "default": 2},
            },
            "required": ["query"],
        },
    },
]

SYSTEM_PROMPT = """Eres Kairós, un copiloto de bienestar digital. Tu rol es ayudar a las personas a entender sus patrones de uso digital y acompañarlas hacia mayor bienestar.

REGLAS CRÍTICAS:
1. NUNCA diagnostiques: no digas "tienes depresión", "tienes ansiedad", "tienes ADHD". Usa palabras como "señales", "patrones", "indicadores".
2. SIEMPRE usa search_playbooks antes de dar recomendaciones de hábitos o intervenciones.
3. Si el usuario muestra señales de crisis (phq9 >= 15 o gad7 >= 15), deriva INMEDIATAMENTE a ayuda profesional y no ofrezcas otra cosa.
4. Compara siempre contra el historial propio del usuario, nunca contra otros.
5. Usa un tono cálido, sin juicios, compasivo.
6. Respuestas concisas: máximo 3-4 párrafos.
7. Habla en español."""

def _execute_tool(tool_name: str, tool_input: dict) -> str:
    """Ejecuta una herramienta y devuelve el resultado como string."""
    try:
        if tool_name == "get_usage_summary":
            result = get_usage_summary(**tool_input)
        elif tool_name == "get_survey_scores":
            result = get_survey_scores(**tool_input)
        elif tool_name == "get_ml_scores":
            result = get_ml_scores(**tool_input)
        elif tool_name == "search_playbooks":
            result = search_playbooks(**tool_input)
        else:
            result = {"error": f"Herramienta desconocida: {tool_name}"}
        return json.dumps(result, ensure_ascii=False, default=str)
    except Exception as e:
        return json.dumps({"error": str(e)})

def chat(user_id: str, message: str) -> dict:
    """Procesa un mensaje del usuario y devuelve la respuesta del agente."""
    
    # Ejecutar triaje para contexto inicial
    triage_result = run_triage(user_id)
    
    # Contexto de triaje para el system prompt de esta conversación
    triage_context = f"\n\nCONTEXTO DE TRIAJE ACTUAL:\n- Nivel: {triage_result['level']}\n- Razón: {triage_result['reason']}"
    if triage_result.get("playbook_slug"):
        triage_context += f"\n- Playbook sugerido: {triage_result['playbook_slug']}"
    
    mem.add_message(user_id, "user", message)
    messages = mem.get_history(user_id)
    
    # Agentic loop con tool_use
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=SYSTEM_PROMPT + triage_context,
        tools=TOOLS,
        messages=messages,
    )
    
    final_text = ""
    
    while response.stop_reason == "tool_use":
        # Extraer tool calls
        tool_calls = [b for b in response.content if b.type == "tool_use"]
        tool_results = []
        
        for tc in tool_calls:
            tool_result = _execute_tool(tc.name, tc.input)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tc.id,
                "content": tool_result,
            })
        
        # Continuar el loop con los resultados
        messages = messages + [
            {"role": "assistant", "content": response.content},
            {"role": "user", "content": tool_results},
        ]
        
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=SYSTEM_PROMPT + triage_context,
            tools=TOOLS,
            messages=messages,
        )
    
    # Extraer texto final
    for block in response.content:
        if hasattr(block, "text"):
            final_text += block.text
    
    mem.add_message(user_id, "assistant", final_text)
    
    return {
        "reply": final_text,
        "playbook_activated": triage_result.get("playbook_slug"),
        "suggested_habit": None,  # TODO: extraer sugerencia de hábito del texto en Fase 2
    }
```

- [ ] **Test del orquestador (requiere ANTHROPIC_API_KEY real)**
```python
# agent-service/tests/test_orchestrator.py
# Este test llama a la API real de Anthropic — usar con moderación
import pytest
from unittest.mock import patch

@patch("agent.orchestrator.run_triage")
@patch("agent.orchestrator.get_usage_summary")
@patch("agent.orchestrator.get_survey_scores")
@patch("agent.orchestrator.get_ml_scores")
@patch("agent.orchestrator.search_playbooks")
def test_chat_returns_reply(mock_search, mock_ml, mock_surveys, mock_usage, mock_triage):
    mock_triage.return_value = {"level": "digital", "playbook_slug": "doomscrolling", "reason": "test"}
    mock_usage.return_value = {"top_domains": [{"domain": "youtube.com", "minutes": 45}], "today_minutes": 45, "avg_daily_minutes": 60, "days_with_data": 3}
    mock_surveys.return_value = {"phq9_score": 4, "phq9_interpretation": "mínimo", "gad7_score": 3, "gad7_interpretation": "mínimo", "crisis_flag": False}
    mock_ml.return_value = {"attention_fragmentation_score": 0.3, "nocturnal_pattern_score": 0.4, "doomscrolling_score": 0.8, "anomaly_flag": False, "anomaly_severity": 0.0, "has_ml_data": True}
    mock_search.return_value = [{"slug": "doomscrolling", "title": "Doomscrolling", "content": "El doomscrolling...", "crisis_escalation": False}]
    
    from agent.orchestrator import chat
    result = chat("test-user", "¿Cómo estoy usando mi tiempo digital?")
    
    assert "reply" in result
    assert len(result["reply"]) > 50  # respuesta con contenido real
```

```bash
pytest tests/test_orchestrator.py -v
# Este test usa la API real de Claude — asegúrate de tener ANTHROPIC_API_KEY
```

- [ ] **Commit**
```bash
git add agent-service/agent/
git commit -m "feat(agent): add Claude orchestrator with tool_use agentic loop"
```

---

### Task 7: Router HTTP del agente

**Files:**
- Create: `agent-service/routers/chat.py`

- [ ] **Crear routers/chat.py**
```python
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from auth import get_current_user
from agent.orchestrator import chat as agent_chat
from agent import memory as mem

router = APIRouter(prefix="/api/v1/agent", tags=["agent"])

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None

class ChatResponse(BaseModel):
    reply: str
    playbook_activated: Optional[str]
    suggested_habit: Optional[str]

class TriggerRequest(BaseModel):
    trigger: str  # 'weekly_report' | 'intervention'

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    user_id: str = Depends(get_current_user)
):
    result = agent_chat(user_id=user_id, message=request.message)
    return ChatResponse(**result)

@router.post("/trigger")
async def trigger_endpoint(
    request: TriggerRequest,
    user_id: str = Depends(get_current_user)
):
    if request.trigger == "weekly_report":
        result = agent_chat(
            user_id=user_id,
            message="Genera un reporte semanal de mi uso digital y bienestar."
        )
        return {"report": result["reply"]}
    return {"error": f"Trigger desconocido: {request.trigger}"}

@router.get("/history")
async def history_endpoint(user_id: str = Depends(get_current_user)):
    return {"messages": mem.get_history(user_id)}
```

- [ ] **Test del endpoint de chat**
```python
# agent-service/tests/test_chat_endpoint.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch("routers.chat.get_current_user", return_value="test-user")
@patch("routers.chat.agent_chat")
def test_chat_endpoint(mock_chat, mock_auth):
    mock_chat.return_value = {
        "reply": "Basándome en tus datos...",
        "playbook_activated": "doomscrolling",
        "suggested_habit": None,
    }
    
    response = client.post(
        "/api/v1/agent/chat",
        json={"message": "¿Cómo estoy?"},
        headers={"Authorization": "Bearer test-token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Basándome en tus datos..."
    assert data["playbook_activated"] == "doomscrolling"
```

```bash
pytest tests/test_chat_endpoint.py -v
```

- [ ] **Commit**
```bash
git add agent-service/routers/
git commit -m "feat(agent): add chat, trigger, and history HTTP endpoints"
```

---

### Task 8: Verificación end-to-end del agente

- [ ] **Arrancar el servicio**
```bash
cd agent-service
uvicorn main:app --reload --port 8001
# Verificar: curl http://localhost:8001/health
```

- [ ] **Test manual del chat (curl)**
```bash
# Primero obtén un token real de Supabase (logueándote en la web app)
# Luego:
curl -X POST http://localhost:8001/api/v1/agent/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{"message": "¿Cómo estoy usando mi tiempo digital esta semana?"}'

# Esperado: {"reply": "...", "playbook_activated": "...", "suggested_habit": null}
```

- [ ] **Verificar RAG funciona**
```bash
# En el log de uvicorn deberías ver que Claude llama a search_playbooks
# La respuesta debe mencionar conceptos de los playbooks, no inventar
```

- [ ] **Commit final**
```bash
git add .
git commit -m "feat(agent): agent-service MVP completo — Claude + RAG + triage + 4 herramientas"
```

- [ ] **Checkpoint — postear en chat del equipo:**
```
✅ [AGENT+ML] Checkpoint:
- Funciona: /chat, /trigger, /history, triage tree, RAG sobre 5 playbooks
- Modelos ML: sin datos reales aún (cold start devuelve 0.0) — normal para MVP
- Para poblar ml_results: insertar manualmente en Supabase para el demo
- Necesito de otro stream: URL del api-service desplegado para apuntar los tools a producción
```

---

### Task 9: Seed de ml_results para la demo

Para que el agente muestre un demo convincente sin esperar datos reales, insertar scores manuales:

```sql
-- Ejecutar en Supabase SQL Editor, reemplazando 'TU_USER_UUID'
-- (obtener el UUID del usuario demo desde Authentication > Users en Supabase)

INSERT INTO ml_results (user_id, model_type, result) VALUES
(
  'TU_USER_UUID',
  'xgboost',
  '{"attention_fragmentation_score": 0.72, "nocturnal_pattern_score": 0.45, "doomscrolling_score": 0.68, "low_mood_indicator_score": 0.0, "anxiety_indicator_score": 0.0}'
),
(
  'TU_USER_UUID',
  'isolation_forest',
  '{"anomaly_flag": false, "severity": 0.12}'
);
```

Con estos scores, el árbol de triaje activará el playbook `attention-fragmentation` y el agente dará una respuesta con evidencia real del RAG.
