# PLAN-04 — Agent Service: Triage Refactor + Playbook Loader

**Área:** agent-service  
**Branch:** `feat/agent/plan-04-triage-refactor`  
**Tiempo estimado:** 1.5 horas  
**Criticidad:** 🟡 Media — mejora auditabilidad + completa spec  
**Owner:** AI Engineer (Juan Gomez)

---

## Goal

El spec define tres módulos separados en `agent-service/triage/`:

- `tree.py` — árbol de reglas (✅ YA EXISTE)
- `playbooks.py` — selección y personalización del playbook activo (❌ FALTA)
- `crisis_escalation.py` — módulo de crisis (❌ FALTA — lógica está en tree.py)

Y en `agent-service/rag/`:
- `playbook_loader.py` — carga los playbooks al índice pgvector (❌ FALTA)

**Nota importante:** La lógica de crisis ya funciona en `tree.py` y en `orchestrator.py`.
Este plan REFACTORIZA, no reescribe desde cero. No debe romper tests existentes.

---

## Contexto técnico

- `agent-service/triage/tree.py` → lógica completa, incluyendo crisis (nivel 1)
- `agent-service/agent/orchestrator.py` → pre-LLM crisis guardrail implementado
- `agent-service/tests/test_crisis_guardrail.py` → tests existentes que NO deben romperse
- `playbooks/scripts/embed_playbooks.py` → script standalone que ya hace lo que playbook_loader.py haría

---

## Pasos de implementación

### Paso 1 — Crear `agent-service/triage/crisis_escalation.py` (20 min)

Extraer la lógica de crisis de `tree.py` en un módulo propio para auditabilidad.
`tree.py` continuará importando de aquí para mantener compatibilidad.

**Archivo:** `agent-service/triage/crisis_escalation.py`

```python
"""
Crisis escalation module — UMBRAL INAMOVIBLE.
PHQ-9 ≥ 15 o GAD-7 ≥ 15 → derivación inmediata a Línea 106.

ADVERTENCIA: Este módulo nunca debe llamar al LLM.
La derivación de crisis es determinista, no generativa.
Cualquier cambio requiere revisión de un profesional de salud mental.
"""


CRISIS_THRESHOLD_PHQ9 = 15
CRISIS_THRESHOLD_GAD7 = 15
EMERGENCY_LINE = "Línea 106"
EMERGENCY_LINE_URL = "https://www.minsalud.gov.co/salud/publica/SMental/Paginas/linea-106.aspx"


def is_crisis(phq9_score: float | None, gad7_score: float | None) -> bool:
    """
    Retorna True si alguno de los scores supera el umbral de crisis.
    Umbral inamovible del spec — no modificar sin revisión clínica.
    """
    if phq9_score is not None and phq9_score >= CRISIS_THRESHOLD_PHQ9:
        return True
    if gad7_score is not None and gad7_score >= CRISIS_THRESHOLD_GAD7:
        return True
    return False


def build_crisis_response(surveys: dict) -> dict:
    """
    Construye la respuesta de triaje para nivel de crisis.
    La respuesta es predeterminada — nunca generada por LLM.
    """
    return {
        "level": "crisis",
        "playbook_slug": "crisis-escalation",
        "reason": "PHQ-9 o GAD-7 en rango severo",
        "context": {"surveys": surveys},
        "emergency_line": EMERGENCY_LINE,
        "emergency_line_url": EMERGENCY_LINE_URL,
        "llm_call_blocked": True,
    }


def get_crisis_message() -> str:
    """
    Mensaje de crisis pre-escrito para mostrar al usuario.
    NO usar el LLM para generar este mensaje — debe ser consistente y confiable.
    """
    return (
        "Veo señales que me indican que puedes estar pasando por un momento muy difícil. "
        "Lo que sientes es válido, y hay personas entrenadas para ayudarte ahora mismo.\n\n"
        f"**{EMERGENCY_LINE} — Línea de atención en salud mental (Colombia)** — disponible 24/7, gratuita.\n\n"
        "Por favor comunícate con ellos. Estoy aquí si quieres hablar después."
    )
```

**Actualizar `tree.py`** para importar de `crisis_escalation.py`:

```python
# En tree.py, reemplazar la sección NIVEL 1 con:
from triage.crisis_escalation import is_crisis, build_crisis_response

def run_triage(user_id: str) -> dict:
    surveys = get_survey_scores(user_id)
    ml = get_ml_scores(user_id)
    usage = get_usage_summary(user_id, days=7)

    # ── NIVEL 1 — CRISIS ───────────────────────────────────────────────────────
    phq9 = surveys.get("phq9_score")
    gad7 = surveys.get("gad7_score")
    if surveys.get("crisis_flag") or is_crisis(phq9, gad7):
        return build_crisis_response(surveys)

    # ... resto del árbol sin cambios ...
```

---

### Paso 2 — Crear `agent-service/triage/playbooks.py` (30 min)

**Archivo:** `agent-service/triage/playbooks.py`

```python
"""
Playbook selection and personalization.
Determina qué playbook aplicar dado el resultado del triage tree
y enriquece el contexto con fragmentos del RAG.
"""
from rag.retriever import search_playbooks
from database import supabase


PLAYBOOK_METADATA: dict[str, dict] = {
    "crisis-escalation": {
        "title": "Protocolo de Crisis",
        "signal_type": "crisis",
        "crisis_escalation": True,
    },
    "attention-fragmentation": {
        "title": "Fragmentación de Atención",
        "signal_type": "attention_fragmentation",
        "crisis_escalation": False,
    },
    "nocturnal-use-pattern": {
        "title": "Patrón de Uso Nocturno",
        "signal_type": "nocturnal_pattern",
        "crisis_escalation": False,
    },
    "doomscrolling": {
        "title": "Doomscrolling",
        "signal_type": "doomscrolling",
        "crisis_escalation": False,
    },
    "low-mood-indicators": {
        "title": "Indicadores de Bajo Ánimo",
        "signal_type": "mood",
        "crisis_escalation": False,
    },
    "anxiety-indicators": {
        "title": "Indicadores de Ansiedad",
        "signal_type": "anxiety",
        "crisis_escalation": False,
    },
    "habit-relapse-risk": {
        "title": "Riesgo de Recaída de Hábito",
        "signal_type": "relapse_risk",
        "crisis_escalation": False,
    },
    "focus-session-intro": {
        "title": "Introducción a Focus Sessions",
        "signal_type": "onboarding",
        "crisis_escalation": False,
    },
    "momentum-builder": {
        "title": "Constructor de Momentum",
        "signal_type": "improving_trend",
        "crisis_escalation": False,
    },
}


def get_active_playbook(user_id: str, triage_result: dict) -> dict:
    """
    Dado el resultado del triage, retorna el playbook activo con:
    - metadata del playbook
    - chunks relevantes del RAG (contexto para el LLM)
    - query sugerida para RAG basada en el contexto del usuario
    """
    slug = triage_result.get("playbook_slug")
    if not slug:
        return {"slug": None, "metadata": {}, "rag_chunks": [], "rag_context": ""}

    metadata = PLAYBOOK_METADATA.get(slug, {})

    # No hacer RAG en crisis — respuesta predeterminada
    if metadata.get("crisis_escalation"):
        return {
            "slug": slug,
            "metadata": metadata,
            "rag_chunks": [],
            "rag_context": "",
        }

    # Construir query de RAG desde el contexto del triage
    rag_query = _build_rag_query(slug, triage_result.get("context", {}))
    chunks = search_playbooks(rag_query, limit=3)

    rag_context = "\n\n---\n\n".join(c.get("chunk_text", "") for c in chunks) if chunks else ""

    return {
        "slug": slug,
        "metadata": metadata,
        "rag_chunks": chunks,
        "rag_context": rag_context,
    }


def _build_rag_query(slug: str, context: dict) -> str:
    """Construye la query semántica para el RAG según el slug activo."""
    base_queries = {
        "attention-fragmentation": "fragmentación de atención intervención hábitos digitales",
        "nocturnal-use-pattern": "uso nocturno teléfono sueño intervención",
        "doomscrolling": "doomscrolling scroll excesivo redes sociales intervención",
        "low-mood-indicators": "indicadores bajo ánimo hábitos bienestar intervención CBT",
        "anxiety-indicators": "ansiedad técnicas regulación respiración mindfulness",
        "habit-relapse-risk": "riesgo recaída hábito prevención adherencia",
        "focus-session-intro": "focus session pomodoro concentración introducción",
        "momentum-builder": "progreso mejora refuerzo positivo adherencia",
    }
    return base_queries.get(slug, f"intervención bienestar digital {slug}")
```

---

### Paso 3 — Crear `agent-service/rag/playbook_loader.py` (20 min)

**Archivo:** `agent-service/rag/playbook_loader.py`

```python
"""
Playbook loader — carga los playbooks procesados a pgvector.
Thin wrapper sobre playbooks/scripts/embed_playbooks.py.
Útil para invocar el embedding desde code (tests, scripts de init).
"""
import sys
import os
from pathlib import Path

# Localizar playbooks/scripts relativo al repo root
_REPO_ROOT = Path(__file__).parent.parent.parent
_EMBED_SCRIPT = _REPO_ROOT / "playbooks" / "scripts" / "embed_playbooks.py"
_PLAYBOOKS_DIR = _REPO_ROOT / "playbooks" / "processed"


def get_playbook_count(supabase) -> int:
    """Retorna cuántos playbooks están cargados en pgvector."""
    res = supabase.table("playbook_chunks").select("id", count="exact").execute()
    return res.count or 0


def load_all_playbooks(supabase) -> dict[str, int]:
    """
    Carga todos los playbooks de playbooks/processed/ a pgvector.
    Retorna dict slug → chunks_count.

    Prerequisito: sentence-transformers instalado, SUPABASE_URL y SUPABASE_ANON_KEY configurados.
    """
    from rag.embedder import embed_texts

    results: dict[str, int] = {}

    for filepath in sorted(_PLAYBOOKS_DIR.glob("*.md")):
        content = filepath.read_text(encoding="utf-8")
        meta, body = _extract_frontmatter(content)
        slug = meta.get("slug", filepath.stem)

        # Upsert playbook
        playbook_res = supabase.table("playbooks").upsert(
            {
                "slug": slug,
                "title": slug.replace("-", " ").title(),
                "signal_type": meta.get("signal_type", "behavioral"),
                "content": body,
                "activates_when": meta.get("activates_when", ""),
                "crisis_escalation": meta.get("crisis_escalation", "false").lower() == "true",
            },
            on_conflict="slug",
        ).execute()

        playbook_id = playbook_res.data[0]["id"]

        # Limpiar chunks anteriores
        supabase.table("playbook_chunks").delete().eq("playbook_id", playbook_id).execute()

        # Chunking y embedding
        chunks = _chunk_text(body)
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
        results[slug] = len(chunks)

    return results


def _extract_frontmatter(content: str) -> tuple[dict, str]:
    if not content.startswith("---"):
        return {}, content
    end = content.find("---", 3)
    if end == -1:
        return {}, content
    meta = {}
    for line in content[3:end].strip().split("\n"):
        if ": " in line:
            k, v = line.split(": ", 1)
            meta[k.strip()] = v.strip()
    return meta, content[end + 3:].strip()


def _chunk_text(text: str, chunk_size: int = 400) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks, current = [], ""
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
```

---

## Tests a crear

**Archivo:** `agent-service/tests/test_crisis_escalation.py`

```python
from triage.crisis_escalation import is_crisis, build_crisis_response, get_crisis_message


def test_crisis_phq9_threshold():
    assert is_crisis(phq9_score=15, gad7_score=0) is True
    assert is_crisis(phq9_score=14, gad7_score=0) is False


def test_crisis_gad7_threshold():
    assert is_crisis(phq9_score=0, gad7_score=15) is True
    assert is_crisis(phq9_score=0, gad7_score=14) is False


def test_crisis_both_below():
    assert is_crisis(phq9_score=7, gad7_score=7) is False


def test_crisis_none_scores():
    assert is_crisis(phq9_score=None, gad7_score=None) is False


def test_build_crisis_response_structure():
    response = build_crisis_response({"phq9_score": 18})
    assert response["level"] == "crisis"
    assert response["playbook_slug"] == "crisis-escalation"
    assert response["llm_call_blocked"] is True
    assert "emergency_line" in response


def test_crisis_message_contains_linea_106():
    msg = get_crisis_message()
    assert "106" in msg
    assert "Colombia" in msg.lower() or "línea" in msg.lower()
```

**Archivo:** `agent-service/tests/test_playbooks_selector.py`

```python
from unittest.mock import patch, MagicMock
from triage.playbooks import get_active_playbook, _build_rag_query, PLAYBOOK_METADATA


def test_get_active_playbook_crisis_no_rag():
    result = get_active_playbook("user-123", {
        "level": "crisis",
        "playbook_slug": "crisis-escalation",
        "context": {},
    })
    assert result["slug"] == "crisis-escalation"
    assert result["rag_chunks"] == []
    assert result["metadata"]["crisis_escalation"] is True


def test_get_active_playbook_no_slug():
    result = get_active_playbook("user-123", {"playbook_slug": None})
    assert result["slug"] is None
    assert result["rag_chunks"] == []


def test_get_active_playbook_with_rag():
    mock_chunks = [{"chunk_text": "La fragmentación de atención...", "similarity": 0.85}]

    with patch("triage.playbooks.search_playbooks", return_value=mock_chunks):
        result = get_active_playbook("user-123", {
            "level": "digital",
            "playbook_slug": "attention-fragmentation",
            "context": {"ml": {"attention_fragmentation_score": 0.72}},
        })

    assert result["slug"] == "attention-fragmentation"
    assert len(result["rag_chunks"]) == 1
    assert "fragmentación" in result["rag_context"]


def test_all_playbook_slugs_have_metadata():
    for slug in ["crisis-escalation", "attention-fragmentation", "nocturnal-use-pattern",
                 "doomscrolling", "low-mood-indicators", "anxiety-indicators",
                 "habit-relapse-risk", "focus-session-intro", "momentum-builder"]:
        assert slug in PLAYBOOK_METADATA, f"Falta metadata para: {slug}"


def test_rag_query_builds_for_known_slug():
    query = _build_rag_query("doomscrolling", {})
    assert "scroll" in query.lower() or "doomscrolling" in query.lower()


def test_existing_triage_tests_still_pass():
    """Asegurar que el refactor no rompe los tests existentes."""
    from triage.tree import run_triage
    from unittest.mock import patch

    with patch("triage.tree.get_survey_scores", return_value={"crisis_flag": False, "phq9_score": None, "gad7_score": None}), \
         patch("triage.tree.get_ml_scores", return_value={}), \
         patch("triage.tree.get_usage_summary", return_value={}), \
         patch("triage.tree._safe_get_forecast", return_value={"relapse_risk_score": 0.0}):

        result = run_triage("user-123")

    assert "level" in result
    assert result["level"] == "default"
```

---

## Ejecución de tests

```bash
cd agent-service

# Tests del nuevo módulo:
python -m pytest tests/test_crisis_escalation.py tests/test_playbooks_selector.py -v

# Regresión — asegurar que refactor no rompe nada:
python -m pytest tests/ -v
```

---

## Definition of Done

- [ ] `triage/crisis_escalation.py` creado con `is_crisis()`, `build_crisis_response()`, `get_crisis_message()`
- [ ] `triage/tree.py` actualizado para importar de `crisis_escalation.py`
- [ ] `triage/playbooks.py` creado con `get_active_playbook()` y `PLAYBOOK_METADATA` completo (9 slugs)
- [ ] `rag/playbook_loader.py` creado con `load_all_playbooks()` y `get_playbook_count()`
- [ ] Tests existentes (`test_triage.py`, `test_crisis_guardrail.py`) siguen pasando
- [ ] `tests/test_crisis_escalation.py` — todos los tests pasan
- [ ] `tests/test_playbooks_selector.py` — todos los tests pasan
- [ ] `python -m pytest tests/ -v` — suite completa sin regresiones

---

## Commit sugerido

```bash
git add agent-service/triage/crisis_escalation.py agent-service/triage/playbooks.py agent-service/rag/playbook_loader.py agent-service/triage/tree.py agent-service/tests/test_crisis_escalation.py agent-service/tests/test_playbooks_selector.py
git commit -m "feat(agent): crisis_escalation module + playbook selector + playbook_loader"
```
