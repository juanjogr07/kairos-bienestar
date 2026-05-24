# PLAN-02 — API Sensing Layer: Validator + Aggregator + ML Trigger

**Área:** api-service  
**Branch:** `feat/api/plan-02-sensing-layer`  
**Tiempo estimado:** 2 horas  
**Criticidad:** 🟠 Alta — completa el pipeline events → features → ML  
**Owner:** API & Connections (Salome) / AI Engineer (Juan Gomez)

---

## Goal

Tres gaps críticos en `api-service`:

1. **Bug:** `events.py` no sanitiza dominios — test `test_domain_sanitized_on_ingest` FALLA
2. **Missing:** `services/sensing/validator.py` — regla de privacidad del spec: nunca URLs completas
3. **Missing:** `services/sensing/aggregator.py` — convierte eventos crudos a `daily_features`
4. **Missing:** endpoint para disparar el ML runner (sin esto no hay forma de calcular scores)

El `api-service/services/ml/runner.py` ya tiene `run_all_models_for_user()` completo.
Solo falta exponerlo via HTTP y un aggregator que llene `daily_features`.

---

## Contexto técnico

- `api-service/services/ml/features.py` → `extract_features_from_events()` ya existe
- `api-service/services/ml/runner.py` → `run_all_models_for_user(user_id, supabase)` ya existe
- `api-service/routers/events.py` → no tiene sanitización de dominio
- Tests patrón: `unittest.mock.patch("routers.events.supabase", mock_db)`

---

## Pasos de implementación

### Paso 1 — Crear `api-service/services/sensing/validator.py` (20 min)

**Archivo:** `api-service/services/sensing/validator.py`

```python
import re
from urllib.parse import urlparse


_URL_PATTERN = re.compile(r"https?://|www\.", re.IGNORECASE)
_BLOCKED_DOMAINS: frozenset[str] = frozenset()  # expandir si es necesario


def sanitize_domain(raw: str) -> str:
    """
    Normaliza un dominio: elimina protocolo, www, paths y query strings.
    Nunca almacena URLs completas (regla de privacidad del spec).

    Ejemplos:
        "https://www.Instagram.com/stories/foo" -> "instagram.com"
        "www.YouTube.com"                       -> "youtube.com"
        "twitter.com"                           -> "twitter.com"
    """
    if not raw:
        return raw

    # Si tiene protocolo, parsear correctamente
    if "://" in raw:
        try:
            parsed = urlparse(raw)
            domain = parsed.netloc or raw
        except Exception:
            domain = raw
    else:
        domain = raw

    # Eliminar www. y convertir a minúsculas
    domain = re.sub(r"^www\.", "", domain, flags=re.IGNORECASE).lower()

    # Eliminar puerto y path
    domain = domain.split(":")[0].split("/")[0]

    return domain.strip()


def validate_event(event: dict) -> dict:
    """
    Valida y sanitiza un evento crudo antes de persistirlo.
    Retorna el evento limpio. Nunca almacena URLs completas.
    """
    sanitized = dict(event)
    if "domain" in sanitized:
        sanitized["domain"] = sanitize_domain(sanitized["domain"])

    # Asegurar que scroll_speed es positivo si existe
    if sanitized.get("scroll_speed") is not None:
        sanitized["scroll_speed"] = abs(float(sanitized["scroll_speed"]))

    # Truncar durations absurdas (> 8h por sesión = error del cliente)
    if sanitized.get("duration_seconds", 0) > 28800:
        sanitized["duration_seconds"] = 28800

    return sanitized
```

**Crear `__init__.py`:**
```python
# api-service/services/sensing/__init__.py
# (archivo vacío)
```

---

### Paso 2 — Crear `api-service/services/sensing/aggregator.py` (25 min)

**Archivo:** `api-service/services/sensing/aggregator.py`

```python
"""
Agrega usage_events de un usuario en un día → daily_features.
Llama a feature engineering de ml/features.py y persiste en daily_features.
"""
from datetime import date, timedelta
import logging

from services.ml.features import extract_features_from_events

logger = logging.getLogger(__name__)


def compute_daily_features(user_id: str, target_date: date, supabase) -> dict:
    """
    Lee usage_events del día, extrae features y upserta en daily_features.
    Retorna el dict de features, o {} si no hay datos suficientes.
    """
    next_day = target_date + timedelta(days=1)

    events_res = (
        supabase.table("usage_events")
        .select("domain, duration_seconds, event_type, scroll_speed, timestamp")
        .eq("user_id", user_id)
        .gte("timestamp", target_date.isoformat())
        .lt("timestamp", next_day.isoformat())
        .execute()
    )

    events = events_res.data or []
    if len(events) < 3:
        logger.info("User %s: solo %d eventos para %s — omitiendo", user_id, len(events), target_date)
        return {}

    features = extract_features_from_events(events)

    supabase.table("daily_features").upsert(
        {
            "user_id": user_id,
            "date": target_date.isoformat(),
            "features": features,
        },
        on_conflict="user_id,date",
    ).execute()

    logger.info("User %s: features computados para %s", user_id, target_date)
    return features


def compute_daily_features_all_users(target_date: date, supabase) -> dict[str, dict]:
    """
    Computa daily_features para todos los usuarios con eventos en target_date.
    Retorna dict user_id → features.
    """
    next_day = target_date + timedelta(days=1)

    res = (
        supabase.table("usage_events")
        .select("user_id")
        .gte("timestamp", target_date.isoformat())
        .lt("timestamp", next_day.isoformat())
        .execute()
    )

    user_ids = list({row["user_id"] for row in (res.data or [])})
    logger.info("Computando features para %d usuarios en %s", len(user_ids), target_date)

    results = {}
    for uid in user_ids:
        features = compute_daily_features(uid, target_date, supabase)
        if features:
            results[uid] = features

    return results
```

---

### Paso 3 — Fix bug: sanitización en `events.py` (10 min)

**Archivo a modificar:** `api-service/routers/events.py`

```python
# Cambio: importar validate_event y aplicar antes de insertar
from fastapi import APIRouter, Depends
from models.events import EventBatch, EventBatchResponse
from auth import get_current_user
from database import supabase
from services.sensing.validator import validate_event  # ← NUEVO

router = APIRouter(prefix="/api/v1", tags=["events"])


@router.post("/events/batch", response_model=EventBatchResponse)
async def ingest_events(
    batch: EventBatch,
    user_id: str = Depends(get_current_user),
):
    if not batch.events:
        return EventBatchResponse(received=0)

    rows = []
    for event in batch.events:
        raw = {
            "user_id": user_id,
            "domain": event.domain,
            "duration_seconds": event.duration_seconds,
            "event_type": event.event_type,
            "scroll_speed": event.scroll_speed,
            "source": "extension",
            "timestamp": event.timestamp.isoformat(),
        }
        rows.append(validate_event(raw))  # ← APLICAR SANITIZACIÓN

    supabase.table("usage_events").insert(rows).execute()
    return EventBatchResponse(received=len(rows))
```

---

### Paso 4 — Crear endpoint ML trigger en `api-service` (25 min)

El spec define un dispatcher Celery, pero `runner.py` ya tiene toda la lógica.
Un endpoint HTTP `/api/v1/ml/run` es más simple y suficiente para el MVP.

**Archivo:** `api-service/routers/ml_trigger.py`

```python
"""
Endpoint interno para disparar el pipeline ML para un usuario.
Llama directamente a runner.run_all_models_for_user() — sin Celery.
Esta decisión simplifica la infraestructura del MVP (sin Redis).
"""
from fastapi import APIRouter, Depends, BackgroundTasks
from auth import get_current_user
from database import supabase
from services.ml.runner import run_all_models_for_user
from services.sensing.aggregator import compute_daily_features
from datetime import date

router = APIRouter(prefix="/api/v1/ml", tags=["ml"])


@router.post("/run")
async def trigger_ml_for_user(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """
    Dispara el pipeline ML para el usuario autenticado.
    Corre en background para no bloquear la respuesta.
    Flujo: usage_events → daily_features → ml_results
    """
    def _run():
        today = date.today()
        compute_daily_features(user_id, today, supabase)
        run_all_models_for_user(user_id, supabase)

    background_tasks.add_task(_run)
    return {"status": "scheduled", "user_id": user_id}


@router.post("/run-all")
async def trigger_ml_all_users(
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
):
    """
    Nightly trigger — corre pipeline ML para todos los usuarios.
    Solo llamar desde el scheduler o manualmente en demo.
    """
    from services.ml.runner import run_all_models_all_users
    from services.sensing.aggregator import compute_daily_features_all_users

    def _run():
        today = date.today()
        compute_daily_features_all_users(today, supabase)
        run_all_models_all_users(supabase)

    background_tasks.add_task(_run)
    return {"status": "scheduled_all"}
```

**Registrar el router en `api-service/main.py`:**
```python
# En main.py, agregar junto a los otros includes:
from routers.ml_trigger import router as ml_router
app.include_router(ml_router)
```

---

## Tests a crear

**Archivo:** `api-service/tests/test_validator.py`

```python
from services.sensing.validator import sanitize_domain, validate_event


def test_sanitize_strips_www():
    assert sanitize_domain("www.Instagram.com") == "instagram.com"


def test_sanitize_strips_protocol():
    assert sanitize_domain("https://www.youtube.com/watch?v=abc") == "youtube.com"


def test_sanitize_preserves_clean_domain():
    assert sanitize_domain("twitter.com") == "twitter.com"


def test_sanitize_lowercase():
    assert sanitize_domain("YOUTUBE.COM") == "youtube.com"


def test_sanitize_strips_path():
    assert sanitize_domain("reddit.com/r/python") == "reddit.com"


def test_validate_event_sanitizes_domain():
    event = {"domain": "www.Instagram.com", "duration_seconds": 120, "scroll_speed": 300.0}
    result = validate_event(event)
    assert result["domain"] == "instagram.com"


def test_validate_event_caps_duration():
    event = {"domain": "youtube.com", "duration_seconds": 999999}
    result = validate_event(event)
    assert result["duration_seconds"] == 28800


def test_validate_event_positive_scroll():
    event = {"domain": "twitter.com", "scroll_speed": -250.5}
    result = validate_event(event)
    assert result["scroll_speed"] == 250.5
```

**Archivo:** `api-service/tests/test_aggregator.py`

```python
from unittest.mock import MagicMock
from datetime import date
from services.sensing.aggregator import compute_daily_features


def test_compute_daily_features_insufficient_events():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        gte.return_value.lt.return_value.execute.return_value = MagicMock(data=[
            {"domain": "youtube.com", "duration_seconds": 120, "event_type": "tab_active",
             "scroll_speed": None, "timestamp": "2026-05-23T10:00:00Z"},
        ])

    result = compute_daily_features("user-123", date(2026, 5, 23), mock_db)
    assert result == {}  # menos de 3 eventos → omitir


def test_compute_daily_features_upserts_result():
    mock_db = MagicMock()
    events = [
        {"domain": "youtube.com", "duration_seconds": 600, "event_type": "tab_active",
         "scroll_speed": 100.0, "timestamp": "2026-05-23T10:00:00Z"},
        {"domain": "instagram.com", "duration_seconds": 300, "event_type": "tab_active",
         "scroll_speed": 500.0, "timestamp": "2026-05-23T23:00:00Z"},
        {"domain": "twitter.com", "duration_seconds": 200, "event_type": "tab_active",
         "scroll_speed": 450.0, "timestamp": "2026-05-23T23:30:00Z"},
    ]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        gte.return_value.lt.return_value.execute.return_value = MagicMock(data=events)
    mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock()

    result = compute_daily_features("user-123", date(2026, 5, 23), mock_db)

    assert "total_minutes" in result
    assert result["total_minutes"] > 0
    mock_db.table.return_value.upsert.assert_called_once()


def test_compute_daily_features_correct_nocturnal():
    mock_db = MagicMock()
    events = [
        {"domain": "youtube.com",   "duration_seconds": 600, "event_type": "tab_active",
         "scroll_speed": None, "timestamp": "2026-05-23T14:00:00Z"},
        {"domain": "instagram.com", "duration_seconds": 600, "event_type": "tab_active",
         "scroll_speed": None, "timestamp": "2026-05-23T23:30:00Z"},
        {"domain": "twitter.com",   "duration_seconds": 600, "event_type": "tab_active",
         "scroll_speed": None, "timestamp": "2026-05-23T01:00:00Z"},
    ]
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        gte.return_value.lt.return_value.execute.return_value = MagicMock(data=events)
    mock_db.table.return_value.upsert.return_value.execute.return_value = MagicMock()

    result = compute_daily_features("user-123", date(2026, 5, 23), mock_db)

    # 2 de 3 eventos son nocturnos (23:30 y 01:00)
    assert result["nocturnal_ratio"] > 0.5


def test_events_endpoint_sanitizes_domain():
    """El router events.py debe sanitizar dominios antes de insertar."""
    from unittest.mock import patch, MagicMock
    from fastapi.testclient import TestClient

    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-uuid"))
    inserted_rows = []

    def capture_insert(rows):
        inserted_rows.extend(rows)
        return MagicMock(execute=lambda: MagicMock())

    mock_db.table.return_value.insert.side_effect = capture_insert

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), patch("routers.events.supabase", mock_db):
        client.post(
            "/api/v1/events/batch",
            json={"events": [{
                "domain": "www.Instagram.com",
                "duration_seconds": 60,
                "event_type": "tab_active",
                "timestamp": "2026-05-23T14:30:00Z",
            }]},
            headers={"Authorization": "Bearer test-token"},
        )

    assert inserted_rows[0]["domain"] == "instagram.com"
```

**Archivo:** `api-service/tests/test_ml_trigger.py`

```python
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient


def test_ml_trigger_returns_scheduled():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-uuid"))

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), \
         patch("routers.ml_trigger.supabase", mock_db), \
         patch("routers.ml_trigger.compute_daily_features"), \
         patch("routers.ml_trigger.run_all_models_for_user"):

        response = client.post(
            "/api/v1/ml/run",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    assert response.json()["status"] == "scheduled"
```

---

## Ejecución de tests

```bash
cd api-service
python -m pytest tests/test_validator.py tests/test_aggregator.py tests/test_ml_trigger.py -v

# Regresión completa:
python -m pytest tests/ -v
```

---

## Definition of Done

- [ ] `services/sensing/__init__.py` creado
- [ ] `services/sensing/validator.py` creado con 3+ funciones
- [ ] `services/sensing/aggregator.py` creado con 2+ funciones
- [ ] `routers/events.py` aplica `validate_event()` en cada fila
- [ ] `routers/ml_trigger.py` creado y registrado en `main.py`
- [ ] `tests/test_validator.py` — todos los tests pasan
- [ ] `tests/test_aggregator.py` — todos los tests pasan
- [ ] `tests/test_ml_trigger.py` — todos los tests pasan
- [ ] `test_domain_sanitized_on_ingest` en `test_events_endpoint.py` pasa (era bug)
- [ ] `python -m pytest tests/ -v` — suite completa pasa

---

## Commit sugerido

```bash
git add api-service/services/sensing/ api-service/routers/ml_trigger.py api-service/routers/events.py api-service/tests/test_validator.py api-service/tests/test_aggregator.py api-service/tests/test_ml_trigger.py api-service/main.py
git commit -m "feat(api): sensing layer validator + aggregator + ML trigger endpoint"
```
