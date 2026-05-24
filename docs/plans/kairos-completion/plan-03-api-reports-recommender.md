# PLAN-03 — API: Reports Router + Habits Recommender

**Área:** api-service  
**Branch:** `feat/api/plan-03-reports-recommender`  
**Tiempo estimado:** 1.5 horas  
**Criticidad:** 🟡 Media — completa funcionalidad de producto  
**Owner:** API & Connections (Salome)

---

## Goal

Dos módulos de `api-service` que faltan según el spec:

1. **`api-service/routers/reports.py`** — endpoint `POST /api/v1/reports/weekly` que dispara el
   reporte semanal al agente. La página `web/kairos-nextjs/app/report/` ya existe y llama a este endpoint.
2. **`api-service/services/habits/recommender.py`** — sugiere hábitos desde playbooks activos.
   El router `habits.py` ya existe pero no tiene sugerencias basadas en playbooks.

---

## Contexto técnico

- `api-service/routers/habits.py` → CRUD de hábitos ya implementado
- `agent-service` en puerto 8001 tiene `/api/v1/agent/trigger` que acepta `{"trigger": "weekly_report"}`
- `web/kairos-nextjs/lib/agent.ts` ya tiene `agentTrigger("weekly_report")`
- Los 9 playbooks tienen `slug` que corresponde al `playbook_slug` de la tabla `habits`

---

## Pasos de implementación

### Paso 1 — Crear `api-service/routers/reports.py` (30 min)

**Archivo:** `api-service/routers/reports.py`

```python
"""
Reports router — dispara generación de reporte semanal al agent-service.
El reporte es generado por Claude y almacenado en weekly_reports.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from database import supabase
from datetime import date, timedelta

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

AGENT_URL = os.getenv("AGENT_SERVICE_URL", "http://localhost:8001")


@router.post("/weekly")
async def generate_weekly_report(user_id: str = Depends(get_current_user)):
    """
    Dispara la generación del reporte semanal al agent-service.
    Retorna el reporte generado o el último disponible si fue generado hoy.
    """
    # Verificar si ya existe un reporte esta semana
    week_start = (date.today() - timedelta(days=date.today().weekday())).isoformat()

    existing = (
        supabase.table("weekly_reports")
        .select("narrative, metrics, created_at")
        .eq("user_id", user_id)
        .gte("week_start", week_start)
        .limit(1)
        .execute()
    )

    if existing.data:
        return {
            "report": existing.data[0]["narrative"],
            "metrics": existing.data[0]["metrics"],
            "cached": True,
            "generated_at": existing.data[0]["created_at"],
        }

    # Pedir al agent-service que genere el reporte
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{AGENT_URL}/api/v1/agent/trigger",
                json={"trigger": "weekly_report"},
                headers={"X-User-Id": user_id},
            )
            resp.raise_for_status()
            agent_response = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="El agente tardó demasiado. Intenta de nuevo.")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Error al contactar el agente: {str(e)}")

    report_text = agent_response.get("report", agent_response.get("response", ""))

    # Persistir el reporte
    supabase.table("weekly_reports").insert({
        "user_id": user_id,
        "week_start": week_start,
        "narrative": report_text,
        "metrics": {},
    }).execute()

    return {
        "report": report_text,
        "metrics": {},
        "cached": False,
    }


@router.get("/weekly/history")
async def list_weekly_reports(
    limit: int = 4,
    user_id: str = Depends(get_current_user),
):
    """Últimos N reportes semanales del usuario."""
    res = (
        supabase.table("weekly_reports")
        .select("id, week_start, narrative, created_at")
        .eq("user_id", user_id)
        .order("week_start", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []
```

**Registrar en `api-service/main.py`:**
```python
from routers.reports import router as reports_router
app.include_router(reports_router)
```

---

### Paso 2 — Crear `api-service/services/habits/recommender.py` (30 min)

**Archivo:** `api-service/services/habits/__init__.py` (vacío)

**Archivo:** `api-service/services/habits/recommender.py`

```python
"""
Habit recommender — sugiere hábitos de los playbooks activos del usuario.
Lee ml_results para saber qué playbook está activo y recomienda hábitos
que el usuario no tiene aún, priorizados por impacto/esfuerzo del playbook.
"""
from database import supabase
from datetime import date, timedelta

PLAYBOOK_HABIT_MAP: dict[str, list[dict]] = {
    "attention-fragmentation": [
        {"name": "Sin teléfono la primera hora del día", "frequency": "daily"},
        {"name": "Bloques de 25 min de trabajo enfocado (Pomodoro)", "frequency": "daily"},
        {"name": "Revisar correo solo 2 veces al día", "frequency": "daily"},
    ],
    "nocturnal-use-pattern": [
        {"name": "No usar el teléfono 30 min antes de dormir", "frequency": "daily"},
        {"name": "Modo avión al acostarse", "frequency": "daily"},
        {"name": "Leer 10 min antes de dormir (sin pantalla)", "frequency": "daily"},
    ],
    "doomscrolling": [
        {"name": "Límite de 15 min de redes sociales por día", "frequency": "daily"},
        {"name": "Activar grayscale en el teléfono a las 9 PM", "frequency": "daily"},
        {"name": "Salir a caminar 10 min cuando sientas el impulso de scrollear", "frequency": "daily"},
    ],
    "low-mood-indicators": [
        {"name": "Registro de 3 cosas positivas del día", "frequency": "daily"},
        {"name": "15 minutos de caminata al aire libre", "frequency": "daily"},
        {"name": "Llamar a un amigo o familiar esta semana", "frequency": "weekly"},
    ],
    "anxiety-indicators": [
        {"name": "Ejercicio de respiración 4-7-8 (3 ciclos)", "frequency": "daily"},
        {"name": "Máximo 10 min de noticias por día", "frequency": "daily"},
        {"name": "15 min de movimiento físico ligero", "frequency": "daily"},
    ],
    "momentum-builder": [
        {"name": "Mantener la rutina que está funcionando", "frequency": "daily"},
        {"name": "Registro del progreso semanal (5 min)", "frequency": "weekly"},
    ],
    "focus-session-intro": [
        {"name": "Primera Focus Session de 25 minutos", "frequency": "daily"},
        {"name": "Ritual de inicio de trabajo (mismo lugar, sin teléfono)", "frequency": "daily"},
    ],
    "crisis-escalation": [],  # No sugerir hábitos en crisis — solo derivar
}


def get_habit_recommendations(user_id: str, limit: int = 3) -> list[dict]:
    """
    Retorna hábitos recomendados del playbook activo del usuario.
    Excluye hábitos que el usuario ya tiene activos.
    """
    # Obtener playbook activo del último ml_result
    lookback = (date.today() - timedelta(days=7)).isoformat()
    ml_res = (
        supabase.table("ml_results")
        .select("result, computed_at")
        .eq("user_id", user_id)
        .eq("model_type", "xgboost_mood")
        .gte("computed_at", lookback)
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )

    active_slug = _determine_playbook_slug(ml_res.data[0]["result"] if ml_res.data else {})
    if not active_slug:
        return []

    candidates = PLAYBOOK_HABIT_MAP.get(active_slug, [])
    if not candidates:
        return []

    # Obtener hábitos que el usuario ya tiene
    existing_res = (
        supabase.table("habits")
        .select("name")
        .eq("user_id", user_id)
        .eq("active", True)
        .execute()
    )
    existing_names = {h["name"] for h in (existing_res.data or [])}

    recommendations = [
        {**h, "playbook_slug": active_slug}
        for h in candidates
        if h["name"] not in existing_names
    ]

    return recommendations[:limit]


def _determine_playbook_slug(ml_result: dict) -> str | None:
    """Misma lógica de triaje que tree.py pero para recomendaciones de hábitos."""
    if not ml_result:
        return None

    if ml_result.get("doomscrolling_score", 0) > 0.70:
        return "doomscrolling"
    if ml_result.get("nocturnal_pattern_score", 0) > 0.65:
        return "nocturnal-use-pattern"
    if ml_result.get("attention_fragmentation_score", 0) > 0.60:
        return "attention-fragmentation"
    return None
```

### Paso 3 — Exponer recomendaciones en el router de hábitos (15 min)

**Modificar `api-service/routers/habits.py`** — agregar endpoint de recomendaciones:

```python
# Agregar al final de habits.py:
from services.habits.recommender import get_habit_recommendations

@router.get("/habits/recommendations")
async def recommend_habits(
    limit: int = 3,
    user_id: str = Depends(get_current_user),
):
    """Sugiere hábitos del playbook activo que el usuario no tiene aún."""
    return get_habit_recommendations(user_id, limit=limit)
```

---

## Tests a crear

**Archivo:** `api-service/tests/test_reports.py`

```python
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient


def test_weekly_report_returns_cached():
    """Si ya existe un reporte esta semana, lo retorna sin llamar al agente."""
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-uuid"))
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        gte.return_value.limit.return_value.execute.return_value = MagicMock(data=[{
            "narrative": "Tu semana en resumen...",
            "metrics": {},
            "created_at": "2026-05-23T10:00:00Z",
        }])

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), patch("routers.reports.supabase", mock_db):
        response = client.post(
            "/api/v1/reports/weekly",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["cached"] is True
    assert "Tu semana" in data["report"]


def test_weekly_report_history_returns_list():
    mock_db = MagicMock()
    mock_db.auth.get_user.return_value = MagicMock(user=MagicMock(id="test-uuid"))
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.\
        limit.return_value.execute.return_value = MagicMock(data=[
            {"id": "abc", "week_start": "2026-05-19", "narrative": "...", "created_at": "2026-05-23"}
        ])

    from main import app
    client = TestClient(app)

    with patch("auth.supabase", mock_db), patch("routers.reports.supabase", mock_db):
        response = client.get(
            "/api/v1/reports/weekly/history",
            headers={"Authorization": "Bearer test-token"},
        )

    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Archivo:** `api-service/tests/test_recommender.py`

```python
from unittest.mock import patch, MagicMock
from services.habits.recommender import get_habit_recommendations, _determine_playbook_slug


def test_determine_playbook_doomscrolling():
    result = {"doomscrolling_score": 0.75, "attention_fragmentation_score": 0.30}
    assert _determine_playbook_slug(result) == "doomscrolling"


def test_determine_playbook_attention_fragmentation():
    result = {"doomscrolling_score": 0.30, "attention_fragmentation_score": 0.65}
    assert _determine_playbook_slug(result) == "attention-fragmentation"


def test_determine_playbook_none_when_all_low():
    result = {"doomscrolling_score": 0.20, "nocturnal_pattern_score": 0.10, "attention_fragmentation_score": 0.15}
    assert _determine_playbook_slug(result) is None


def test_recommendations_exclude_existing_habits():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=[{
            "result": {"attention_fragmentation_score": 0.72}
        }])
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        execute.return_value = MagicMock(data=[
            {"name": "Sin teléfono la primera hora del día"}
        ])

    with patch("services.habits.recommender.supabase", mock_db):
        recs = get_habit_recommendations("user-123", limit=3)

    names = [r["name"] for r in recs]
    assert "Sin teléfono la primera hora del día" not in names
    assert len(recs) <= 3


def test_recommendations_empty_when_no_ml_data():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        gte.return_value.order.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.\
        execute.return_value = MagicMock(data=[])

    with patch("services.habits.recommender.supabase", mock_db):
        recs = get_habit_recommendations("user-123")

    assert recs == []
```

---

## Ejecución de tests

```bash
cd api-service
python -m pytest tests/test_reports.py tests/test_recommender.py -v

# Regresión completa:
python -m pytest tests/ -v
```

---

## Definition of Done

- [ ] `routers/reports.py` creado y registrado en `main.py`
- [ ] `GET /api/v1/reports/weekly/history` funciona
- [ ] `POST /api/v1/reports/weekly` funciona (con mock del agente)
- [ ] `services/habits/__init__.py` creado
- [ ] `services/habits/recommender.py` creado con `PLAYBOOK_HABIT_MAP` completo
- [ ] `GET /api/v1/habits/recommendations` funciona
- [ ] `tests/test_reports.py` — todos los tests pasan
- [ ] `tests/test_recommender.py` — todos los tests pasan
- [ ] `python -m pytest tests/ -v` — suite completa sin regresiones

---

## Commit sugerido

```bash
git add api-service/routers/reports.py api-service/services/habits/ api-service/routers/habits.py api-service/tests/test_reports.py api-service/tests/test_recommender.py api-service/main.py
git commit -m "feat(api): reports router + habit recommender from active playbook"
```
