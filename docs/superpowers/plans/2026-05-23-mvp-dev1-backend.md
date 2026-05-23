# Kairós MVP — Dev 1: Backend (api-service)

> **Para agentic workers:** REQUIRED SUB-SKILL: Usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea.

**Goal:** Construir el api-service de Kairós en FastAPI: auth, ingesta de eventos de comportamiento, encuestas PHQ-9/GAD-7, hábitos con rachas, y dashboard de métricas. Todo conectado a Supabase.

**Architecture:** FastAPI con routers por dominio, Supabase como única base de datos (PostgreSQL + pgvector), autenticación vía JWT de Supabase validado en cada request. El servicio corre en Railway en producción y en `localhost:8000` en desarrollo.

**Tech Stack:** Python 3.11+, FastAPI, supabase-py, python-jose, pydantic v2, uvicorn

---

## Contexto del proyecto

Kairós es una plataforma de bienestar digital. Este stream (api-service) es el backend principal — gestiona usuarios, recibe eventos de comportamiento desde la extensión de Chrome, almacena respuestas de encuestas PHQ-9/GAD-7, y sirve datos al frontend. **No incluye el agente de IA** — ese es un servicio separado (agent-service) en `localhost:8001`.

**Tu directorio:** solo modifica `api-service/` e `infra/supabase/`. No toques `web/`, `extension/`, `agent-service/`, ni `playbooks/`.

---

## Estructura de archivos a crear

```
api-service/
├── main.py                    # FastAPI app, CORS, routers
├── config.py                  # Settings desde env vars
├── auth.py                    # Middleware JWT Supabase
├── database.py                # Cliente Supabase
├── requirements.txt
├── routers/
│   ├── __init__.py
│   ├── events.py              # POST /api/v1/events/batch
│   ├── surveys.py             # POST /api/v1/surveys/{type}
│   ├── dashboard.py           # GET /api/v1/dashboard
│   └── habits.py              # CRUD hábitos + POST complete
├── models/
│   ├── __init__.py
│   ├── events.py              # Pydantic models para eventos
│   ├── surveys.py             # Pydantic models para encuestas
│   └── habits.py              # Pydantic models para hábitos
└── services/
    ├── __init__.py
    └── streak_engine.py       # Lógica de rachas y días de gracia

infra/supabase/
└── migrations/
    └── 001_initial_schema.sql  # Schema completo
```

---

### Task 1: Setup del proyecto Python

**Files:**
- Create: `api-service/requirements.txt`
- Create: `api-service/config.py`
- Create: `api-service/database.py`
- Create: `api-service/main.py`

- [ ] **Crear requirements.txt**
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
supabase==2.9.0
python-jose[cryptography]==3.3.0
pydantic==2.7.0
pydantic-settings==2.3.0
python-dotenv==1.0.0
httpx==0.27.0
```

- [ ] **Instalar dependencias**
```bash
cd api-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

- [ ] **Crear config.py**
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    
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

- [ ] **Crear main.py**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import events, surveys, dashboard, habits

app = FastAPI(title="Kairós API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "chrome-extension://*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events.router)
app.include_router(surveys.router)
app.include_router(dashboard.router)
app.include_router(habits.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "api-service"}
```

- [ ] **Verificar que arranca**
```bash
uvicorn main:app --reload --port 8000
# Esperado: INFO: Application startup complete.
# Verificar: curl http://localhost:8000/health
# Esperado: {"status":"ok","service":"api-service"}
```

- [ ] **Commit**
```bash
git add api-service/
git commit -m "feat(backend): setup FastAPI project structure"
```

---

### Task 2: Schema de Supabase

**Files:**
- Create: `infra/supabase/migrations/001_initial_schema.sql`

- [ ] **Crear el archivo de migración**
```sql
-- infra/supabase/migrations/001_initial_schema.sql

-- Habilitar extensión pgvector (para el agente de IA)
CREATE EXTENSION IF NOT EXISTS vector;

-- EVENTOS DE USO
CREATE TABLE IF NOT EXISTS usage_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  domain text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  event_type text NOT NULL CHECK (event_type IN ('tab_active','tab_idle','scroll','notification')),
  scroll_speed float,
  source text NOT NULL DEFAULT 'extension' CHECK (source IN ('extension','android','survey')),
  timestamp timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON usage_events (user_id, timestamp DESC);
CREATE INDEX ON usage_events (user_id, domain);

-- ENCUESTAS
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  survey_type text NOT NULL CHECK (survey_type IN ('phq9','gad7','ema')),
  responses jsonb NOT NULL,
  total_score float NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX ON survey_responses (user_id, survey_type, created_at DESC);

-- HÁBITOS
CREATE TABLE IF NOT EXISTS habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  playbook_slug text,
  frequency text NOT NULL DEFAULT 'daily',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_completions (
  id bigserial PRIMARY KEY,
  habit_id uuid REFERENCES habits ON DELETE CASCADE,
  user_id uuid NOT NULL,
  completed_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid UNIQUE REFERENCES habits ON DELETE CASCADE,
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_completion date,
  grace_days_used integer NOT NULL DEFAULT 0
);

-- RESULTADOS ML (pre-creada para que el agente pueda escribir)
CREATE TABLE IF NOT EXISTS ml_results (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  model_type text NOT NULL,
  result jsonb NOT NULL,
  computed_at timestamptz DEFAULT now()
);
CREATE INDEX ON ml_results (user_id, model_type, computed_at DESC);

-- FEATURES DIARIAS
CREATE TABLE IF NOT EXISTS daily_features (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  date date NOT NULL,
  features jsonb NOT NULL,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- PLAYBOOKS RAG (para agente)
CREATE TABLE IF NOT EXISTS playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  signal_type text,
  content text NOT NULL,
  activates_when text,
  crisis_escalation boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playbook_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id uuid REFERENCES playbooks ON DELETE CASCADE,
  chunk_text text NOT NULL,
  embedding vector(384),
  chunk_index integer NOT NULL
);
CREATE INDEX ON playbook_chunks USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

-- REPORTES
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  narrative text,
  metrics jsonb,
  created_at timestamptz DEFAULT now()
);

-- INTERVENCIONES
CREATE TABLE IF NOT EXISTS intervention_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_type text,
  playbook_slug text,
  shown_at timestamptz DEFAULT now(),
  acted_upon boolean DEFAULT false
);
```

- [ ] **Ejecutar en Supabase**
  - Abrir Supabase Dashboard → SQL Editor
  - Pegar y ejecutar el contenido de `001_initial_schema.sql`
  - Verificar que todas las tablas aparecen en Table Editor

- [ ] **Commit**
```bash
git add infra/
git commit -m "feat(backend): add initial Supabase schema migration"
```

---

### Task 3: Autenticación JWT

**Files:**
- Create: `api-service/auth.py`

- [ ] **Crear auth.py**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from database import supabase

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    token = credentials.credentials
    try:
        # Verificar token con Supabase
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido o expirado"
            )
        return str(response.user.id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado"
        )
```

- [ ] **Test de auth**
```python
# api-service/tests/test_auth.py
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app

client = TestClient(app)

def test_health_no_auth():
    response = client.get("/health")
    assert response.status_code == 200

def test_events_requires_auth():
    response = client.post("/api/v1/events/batch", json={"events": []})
    assert response.status_code == 403  # No token

def test_events_invalid_token():
    response = client.post(
        "/api/v1/events/batch",
        json={"events": []},
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
```

- [ ] **Ejecutar tests**
```bash
cd api-service
pytest tests/test_auth.py -v
# Esperado: test_health_no_auth PASS, test_events_requires_auth PASS, test_events_invalid_token PASS
```

- [ ] **Commit**
```bash
git add api-service/auth.py api-service/tests/
git commit -m "feat(backend): add Supabase JWT authentication middleware"
```

---

### Task 4: Endpoint de eventos de uso

**Files:**
- Create: `api-service/models/events.py`
- Create: `api-service/routers/events.py`

- [ ] **Crear models/events.py**
```python
from pydantic import BaseModel, field_validator
from typing import List, Optional, Literal
from datetime import datetime

class UsageEvent(BaseModel):
    domain: str
    duration_seconds: int
    event_type: Literal["tab_active", "tab_idle", "scroll", "notification"]
    scroll_speed: Optional[float] = None
    timestamp: datetime

    @field_validator("domain")
    @classmethod
    def sanitize_domain(cls, v: str) -> str:
        # Solo guardar el dominio, nunca la URL completa
        v = v.lower().strip()
        # Remover www.
        if v.startswith("www."):
            v = v[4:]
        return v

class EventBatch(BaseModel):
    events: List[UsageEvent]

class EventBatchResponse(BaseModel):
    received: int
```

- [ ] **Test del modelo**
```python
# api-service/tests/test_events_model.py
from models.events import UsageEvent
from datetime import datetime

def test_domain_sanitization():
    event = UsageEvent(
        domain="www.Instagram.com",
        duration_seconds=120,
        event_type="tab_active",
        timestamp=datetime.now()
    )
    assert event.domain == "instagram.com"

def test_scroll_speed_optional():
    event = UsageEvent(
        domain="youtube.com",
        duration_seconds=60,
        event_type="scroll",
        timestamp=datetime.now()
    )
    assert event.scroll_speed is None
```

- [ ] **Ejecutar test**
```bash
pytest tests/test_events_model.py -v
```

- [ ] **Crear routers/events.py**
```python
from fastapi import APIRouter, Depends
from models.events import EventBatch, EventBatchResponse
from auth import get_current_user
from database import supabase

router = APIRouter(prefix="/api/v1", tags=["events"])

@router.post("/events/batch", response_model=EventBatchResponse)
async def ingest_events(
    batch: EventBatch,
    user_id: str = Depends(get_current_user)
):
    if not batch.events:
        return EventBatchResponse(received=0)
    
    rows = [
        {
            "user_id": user_id,
            "domain": event.domain,
            "duration_seconds": event.duration_seconds,
            "event_type": event.event_type,
            "scroll_speed": event.scroll_speed,
            "source": "extension",
            "timestamp": event.timestamp.isoformat(),
        }
        for event in batch.events
    ]
    
    supabase.table("usage_events").insert(rows).execute()
    return EventBatchResponse(received=len(rows))
```

- [ ] **Test del endpoint (con mock de Supabase)**
```python
# api-service/tests/test_events_endpoint.py
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch("routers.events.supabase")
@patch("routers.events.get_current_user", return_value="test-user-uuid")
def test_ingest_events(mock_auth, mock_db):
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    
    response = client.post(
        "/api/v1/events/batch",
        json={
            "events": [
                {
                    "domain": "youtube.com",
                    "duration_seconds": 120,
                    "event_type": "tab_active",
                    "timestamp": "2026-05-23T14:30:00Z"
                }
            ]
        },
        headers={"Authorization": "Bearer test-token"}
    )
    
    assert response.status_code == 200
    assert response.json()["received"] == 1

@patch("routers.events.get_current_user", return_value="test-user-uuid")
def test_empty_batch(mock_auth):
    response = client.post(
        "/api/v1/events/batch",
        json={"events": []},
        headers={"Authorization": "Bearer test-token"}
    )
    assert response.status_code == 200
    assert response.json()["received"] == 0
```

- [ ] **Ejecutar tests**
```bash
pytest tests/test_events_endpoint.py -v
# Esperado: 2 tests PASS
```

- [ ] **Commit**
```bash
git add api-service/models/events.py api-service/routers/events.py api-service/tests/
git commit -m "feat(backend): add events batch ingestion endpoint"
```

---

### Task 5: Endpoint de encuestas (PHQ-9 y GAD-7)

**Files:**
- Create: `api-service/models/surveys.py`
- Create: `api-service/routers/surveys.py`

- [ ] **Crear models/surveys.py**
```python
from pydantic import BaseModel, field_validator
from typing import Dict, Literal

class SurveySubmission(BaseModel):
    responses: Dict[str, int]
    total_score: float

    @field_validator("responses")
    @classmethod
    def validate_response_values(cls, v: Dict[str, int]) -> Dict[str, int]:
        for key, val in v.items():
            if not (0 <= val <= 3):
                raise ValueError(f"Respuesta {key} debe estar entre 0 y 3")
        return v

class SurveyResponse(BaseModel):
    id: str
    created_at: str

PHQ9_QUESTIONS = {
    "q1": "Poco interés o placer en hacer cosas",
    "q2": "Sentirse decaído/a, deprimido/a o sin esperanzas",
    "q3": "Problemas para dormir",
    "q4": "Sentirse cansado/a",
    "q5": "Poco apetito o comer en exceso",
    "q6": "Sentirse mal consigo mismo/a",
    "q7": "Dificultad para concentrarse",
    "q8": "Moverse o hablar lento / estar inquieto/a",
    "q9": "Pensamientos de hacerse daño",
}

GAD7_QUESTIONS = {
    "q1": "Sentirse nervioso/a o ansioso/a",
    "q2": "No poder dejar de preocuparse",
    "q3": "Preocuparse demasiado por cosas diferentes",
    "q4": "Dificultad para relajarse",
    "q5": "Estar tan inquieto/a que es difícil estarse quieto/a",
    "q6": "Irritarse o enojarse fácilmente",
    "q7": "Sentir miedo de que algo terrible puede pasar",
}

SURVEY_QUESTIONS = {"phq9": PHQ9_QUESTIONS, "gad7": GAD7_QUESTIONS}
```

- [ ] **Crear routers/surveys.py**
```python
from fastapi import APIRouter, Depends, HTTPException, Path
from models.surveys import SurveySubmission, SurveyResponse, SURVEY_QUESTIONS
from auth import get_current_user
from database import supabase
from typing import Literal

router = APIRouter(prefix="/api/v1", tags=["surveys"])

VALID_SURVEY_TYPES = ["phq9", "gad7", "ema"]

@router.post("/surveys/{survey_type}", response_model=SurveyResponse)
async def submit_survey(
    survey_type: str = Path(...),
    submission: SurveySubmission = ...,
    user_id: str = Depends(get_current_user)
):
    if survey_type not in VALID_SURVEY_TYPES:
        raise HTTPException(status_code=400, detail=f"Tipo de encuesta inválido: {survey_type}")

    result = supabase.table("survey_responses").insert({
        "user_id": user_id,
        "survey_type": survey_type,
        "responses": submission.responses,
        "total_score": submission.total_score,
    }).execute()

    row = result.data[0]
    return SurveyResponse(id=row["id"], created_at=str(row["created_at"]))
```

- [ ] **Test del endpoint**
```python
# api-service/tests/test_surveys.py
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch("routers.surveys.supabase")
@patch("routers.surveys.get_current_user", return_value="test-user-uuid")
def test_submit_phq9(mock_auth, mock_db):
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{"id": "test-uuid", "created_at": "2026-05-23T00:00:00"}]
    )
    
    response = client.post(
        "/api/v1/surveys/phq9",
        json={
            "responses": {"q1": 2, "q2": 1, "q3": 0, "q4": 2, "q5": 1, "q6": 0, "q7": 1, "q8": 2, "q9": 0},
            "total_score": 9
        },
        headers={"Authorization": "Bearer test-token"}
    )
    
    assert response.status_code == 200
    assert "id" in response.json()

@patch("routers.surveys.get_current_user", return_value="test-user-uuid")
def test_invalid_survey_type(mock_auth):
    response = client.post(
        "/api/v1/surveys/invalidtype",
        json={"responses": {}, "total_score": 0},
        headers={"Authorization": "Bearer test-token"}
    )
    assert response.status_code == 400
```

- [ ] **Ejecutar tests**
```bash
pytest tests/test_surveys.py -v
```

- [ ] **Commit**
```bash
git add api-service/models/surveys.py api-service/routers/surveys.py api-service/tests/
git commit -m "feat(backend): add PHQ-9 and GAD-7 survey endpoints"
```

---

### Task 6: Dashboard endpoint

**Files:**
- Create: `api-service/routers/dashboard.py`

- [ ] **Crear routers/dashboard.py**
```python
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import supabase
from datetime import date, timedelta
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1", tags=["dashboard"])

class DomainUsage(BaseModel):
    domain: str
    minutes: int

class DashboardResponse(BaseModel):
    today_usage_min: int
    top_domains: List[DomainUsage]
    active_habits: int
    total_habit_completions_today: int
    last_phq9_score: Optional[float]
    last_gad7_score: Optional[float]
    last_survey_date: Optional[str]
    onboarding_completed: bool

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(user_id: str = Depends(get_current_user)):
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()

    # Eventos de hoy
    events_res = supabase.table("usage_events")\
        .select("domain, duration_seconds")\
        .eq("user_id", user_id)\
        .gte("timestamp", today)\
        .lt("timestamp", tomorrow)\
        .execute()

    # Calcular uso total y por dominio
    domain_map: dict[str, int] = {}
    for ev in events_res.data:
        d = ev["domain"]
        domain_map[d] = domain_map.get(d, 0) + ev["duration_seconds"]

    today_usage_min = sum(domain_map.values()) // 60
    top_domains = sorted(
        [DomainUsage(domain=k, minutes=v // 60) for k, v in domain_map.items()],
        key=lambda x: x.minutes,
        reverse=True
    )[:5]

    # Hábitos activos
    habits_res = supabase.table("habits")\
        .select("id")\
        .eq("user_id", user_id)\
        .eq("active", True)\
        .execute()
    active_habits = len(habits_res.data)

    # Completaciones de hábitos hoy
    completions_res = supabase.table("habit_completions")\
        .select("id")\
        .eq("user_id", user_id)\
        .gte("completed_at", today)\
        .execute()
    total_habit_completions_today = len(completions_res.data)

    # Última encuesta PHQ-9
    phq9_res = supabase.table("survey_responses")\
        .select("total_score, created_at")\
        .eq("user_id", user_id)\
        .eq("survey_type", "phq9")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    last_phq9_score = phq9_res.data[0]["total_score"] if phq9_res.data else None
    last_survey_date = phq9_res.data[0]["created_at"][:10] if phq9_res.data else None

    # Última encuesta GAD-7
    gad7_res = supabase.table("survey_responses")\
        .select("total_score")\
        .eq("user_id", user_id)\
        .eq("survey_type", "gad7")\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()
    last_gad7_score = gad7_res.data[0]["total_score"] if gad7_res.data else None

    onboarding_completed = last_phq9_score is not None and last_gad7_score is not None

    return DashboardResponse(
        today_usage_min=today_usage_min,
        top_domains=top_domains,
        active_habits=active_habits,
        total_habit_completions_today=total_habit_completions_today,
        last_phq9_score=last_phq9_score,
        last_gad7_score=last_gad7_score,
        last_survey_date=last_survey_date,
        onboarding_completed=onboarding_completed,
    )
```

- [ ] **Test del dashboard**
```python
# api-service/tests/test_dashboard.py
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

@patch("routers.dashboard.supabase")
@patch("routers.dashboard.get_current_user", return_value="test-user-uuid")
def test_dashboard_empty_user(mock_auth, mock_db):
    # Simular usuario sin datos
    mock_table = MagicMock()
    mock_table.select.return_value.eq.return_value.gte.return_value.lt.return_value.execute.return_value = MagicMock(data=[])
    mock_table.select.return_value.eq.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    mock_table.select.return_value.eq.return_value.gte.return_value.execute.return_value = MagicMock(data=[])
    mock_table.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value = mock_table
    
    response = client.get(
        "/api/v1/dashboard",
        headers={"Authorization": "Bearer test-token"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["today_usage_min"] == 0
    assert data["onboarding_completed"] == False
    assert data["active_habits"] == 0
```

- [ ] **Ejecutar test**
```bash
pytest tests/test_dashboard.py -v
```

- [ ] **Commit**
```bash
git add api-service/routers/dashboard.py api-service/tests/
git commit -m "feat(backend): add dashboard metrics endpoint"
```

---

### Task 7: Hábitos y rachas

**Files:**
- Create: `api-service/services/streak_engine.py`
- Create: `api-service/routers/habits.py`

- [ ] **Crear services/streak_engine.py**
```python
from datetime import date, timedelta
from database import supabase

GRACE_DAYS_ALLOWED = 1

def calculate_streak_after_completion(user_id: str, habit_id: str) -> dict:
    """Calcula la racha actualizada después de una completación."""
    today = date.today()
    
    # Obtener o crear registro de racha
    streak_res = supabase.table("streaks")\
        .select("*")\
        .eq("habit_id", habit_id)\
        .execute()

    if not streak_res.data:
        # Primera completación
        supabase.table("streaks").insert({
            "habit_id": habit_id,
            "user_id": user_id,
            "current_streak": 1,
            "longest_streak": 1,
            "last_completion": today.isoformat(),
            "grace_days_used": 0,
        }).execute()
        return {"streak": 1, "message": "¡Primer día! El camino empieza aquí."}

    streak = streak_res.data[0]
    last = date.fromisoformat(streak["last_completion"]) if streak["last_completion"] else None

    if last == today:
        # Ya completada hoy
        return {"streak": streak["current_streak"], "message": "Ya registraste este hábito hoy."}

    days_diff = (today - last).days if last else 999

    if days_diff == 1:
        # Día consecutivo
        new_streak = streak["current_streak"] + 1
        msg = f"¡{new_streak} días seguidos! Sigue así 💪"
    elif days_diff <= (GRACE_DAYS_ALLOWED + 1) and streak["grace_days_used"] < GRACE_DAYS_ALLOWED:
        # Día de gracia
        new_streak = streak["current_streak"] + 1
        msg = f"Usaste un día de gracia. Racha: {new_streak} días."
        supabase.table("streaks").update({"grace_days_used": streak["grace_days_used"] + 1})\
            .eq("habit_id", habit_id).execute()
    else:
        # Racha rota — reiniciar con tono compasivo
        new_streak = 1
        msg = "Nuevo comienzo. Cada día es una oportunidad 🌱"
        supabase.table("streaks").update({"grace_days_used": 0})\
            .eq("habit_id", habit_id).execute()

    longest = max(new_streak, streak["longest_streak"])
    supabase.table("streaks").update({
        "current_streak": new_streak,
        "longest_streak": longest,
        "last_completion": today.isoformat(),
    }).eq("habit_id", habit_id).execute()

    return {"streak": new_streak, "message": msg}
```

- [ ] **Test del streak engine**
```python
# api-service/tests/test_streak_engine.py
from unittest.mock import patch, MagicMock
from datetime import date, timedelta

@patch("services.streak_engine.supabase")
def test_first_completion(mock_db):
    from services.streak_engine import calculate_streak_after_completion
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value.insert.return_value.execute.return_value = MagicMock()
    
    result = calculate_streak_after_completion("user-1", "habit-1")
    assert result["streak"] == 1

@patch("services.streak_engine.supabase")
def test_consecutive_day(mock_db):
    from services.streak_engine import calculate_streak_after_completion
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{"current_streak": 3, "longest_streak": 3, "last_completion": yesterday, "grace_days_used": 0}]
    )
    mock_db.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
    
    result = calculate_streak_after_completion("user-1", "habit-1")
    assert result["streak"] == 4
```

- [ ] **Crear routers/habits.py**
```python
from fastapi import APIRouter, Depends
from auth import get_current_user
from database import supabase
from services.streak_engine import calculate_streak_after_completion
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/api/v1", tags=["habits"])

class HabitCreate(BaseModel):
    name: str
    playbook_slug: Optional[str] = None
    frequency: str = "daily"

class HabitOut(BaseModel):
    id: str
    name: str
    playbook_slug: Optional[str]
    frequency: str
    active: bool
    current_streak: int
    completed_today: bool

@router.get("/habits", response_model=List[HabitOut])
async def list_habits(user_id: str = Depends(get_current_user)):
    habits_res = supabase.table("habits")\
        .select("id, name, playbook_slug, frequency, active")\
        .eq("user_id", user_id)\
        .eq("active", True)\
        .execute()

    result = []
    for h in habits_res.data:
        streak_res = supabase.table("streaks")\
            .select("current_streak, last_completion")\
            .eq("habit_id", h["id"])\
            .execute()
        
        streak = streak_res.data[0] if streak_res.data else {"current_streak": 0, "last_completion": None}
        
        from datetime import date
        completed_today = streak.get("last_completion") == date.today().isoformat()
        
        result.append(HabitOut(
            id=h["id"],
            name=h["name"],
            playbook_slug=h.get("playbook_slug"),
            frequency=h["frequency"],
            active=h["active"],
            current_streak=streak["current_streak"],
            completed_today=completed_today,
        ))

    return result

@router.post("/habits", response_model=HabitOut)
async def create_habit(habit: HabitCreate, user_id: str = Depends(get_current_user)):
    res = supabase.table("habits").insert({
        "user_id": user_id,
        "name": habit.name,
        "playbook_slug": habit.playbook_slug,
        "frequency": habit.frequency,
    }).execute()
    
    h = res.data[0]
    return HabitOut(
        id=h["id"],
        name=h["name"],
        playbook_slug=h.get("playbook_slug"),
        frequency=h["frequency"],
        active=True,
        current_streak=0,
        completed_today=False,
    )

@router.post("/habits/{habit_id}/complete")
async def complete_habit(habit_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("habit_completions").insert({
        "habit_id": habit_id,
        "user_id": user_id,
    }).execute()
    
    return calculate_streak_after_completion(user_id, habit_id)
```

- [ ] **Ejecutar todos los tests**
```bash
pytest tests/ -v
# Esperado: todos PASS
```

- [ ] **Commit final**
```bash
git add api-service/services/ api-service/routers/habits.py api-service/tests/
git commit -m "feat(backend): add habits CRUD and streak engine"
```

---

### Task 8: Verificación final del servicio

- [ ] **Arrancar el servicio**
```bash
cd api-service
uvicorn main:app --reload --port 8000
```

- [ ] **Verificar todos los endpoints**
```bash
# Health
curl http://localhost:8000/health
# Esperado: {"status":"ok","service":"api-service"}

# Docs automáticos de FastAPI
# Abrir: http://localhost:8000/docs
# Deben aparecer: /health, /api/v1/events/batch, /api/v1/surveys/{type},
#                 /api/v1/dashboard, /api/v1/habits
```

- [ ] **Postear en el chat del equipo — Checkpoint 1:**
```
✅ [BACKEND] Hora 8 checkpoint:
- Funciona: /health, /events/batch, /surveys/phq9, /surveys/gad7, /dashboard, /habits
- Bloqueado en: nada
- Necesito de otro stream: credenciales Supabase ya compartidas, Dev 4 puede empezar a escribir en DB directamente
```

- [ ] **Commit final**
```bash
git add .
git commit -m "feat(backend): api-service MVP completo — todos los endpoints funcionando"
```
