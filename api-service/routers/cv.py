"""
CV Router — POST /api/v1/cv/analyze
           GET  /api/v1/cv/status
           POST /api/v1/cv/report   (session report → LLM payload)
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth import get_current_user
from database import supabase
from services.cv_service import analyze_frame, CV_AVAILABLE

router = APIRouter(prefix="/api/v1/cv", tags=["computer-vision"])


# ── Request / Response models ─────────────────────────────────────────────────

class CVAnalyzeRequest(BaseModel):
    webcam_frame_b64: str | None = Field(None)
    env_frame_b64:    str | None = Field(None)


class PostureOut(BaseModel):
    posture_score:       float
    eye_strain_score:    float
    blink_rate_rpm:      float
    head_tilt_deg:       float
    landmarks_detected:  bool
    shoulder_tension:    float = 0.0
    body_movement_rate:  float = 0.0
    wrist_face_distance: float = 1.0


class BoxOut(BaseModel):
    label:      str
    confidence: float
    x1: float; y1: float; x2: float; y2: float


class EnvironmentOut(BaseModel):
    context:          str
    confidence:       float
    detected_objects: list[str]
    boxes:            list[BoxOut] = []


class AnxietyOut(BaseModel):
    anxiety_score:      float
    stress_level:       str
    face_touch_rate:    float
    head_movement_rate: float
    postural_sway:      float
    shoulder_tension:   float
    fidget_score:       float
    indicators:         list[str]


class ObjectScoreOut(BaseModel):
    label:              str
    category:           str
    productivity_score: float
    distraction_score:  float
    count:              int


class PoseLandmarkOut(BaseModel):
    x: float; y: float; z: float; visibility: float


class CVAnalyzeResponse(BaseModel):
    cv_available:             bool
    physical_wellness_score:  float
    digital_context_score:    float
    distraction_risk_score:   float
    posture:                  PostureOut
    environment:              EnvironmentOut
    anxiety:                  AnxietyOut
    object_scores:            list[ObjectScoreOut] = []
    pose_landmarks:           list[PoseLandmarkOut] = []
    persisted:                bool = False


# ── Session report ────────────────────────────────────────────────────────────

class SessionMetricSnapshot(BaseModel):
    """Un snapshot de métricas en un momento de la sesión."""
    timestamp_s:          float
    posture_score:        float
    eye_strain_score:     float
    anxiety_score:        float
    stress_level:         str
    shoulder_tension:     float
    face_touch_rate:      float
    distraction_risk:     float
    environment_context:  str
    blink_rate_rpm:       float

class ObjectInteraction(BaseModel):
    label:              str
    category:           str
    frames_detected:    int
    productivity_score: float
    distraction_score:  float

class SessionReportRequest(BaseModel):
    duration_seconds:   float
    total_frames:       int
    snapshots:          list[SessionMetricSnapshot]
    object_interactions: list[ObjectInteraction] = []

class SessionReportResponse(BaseModel):
    summary:         dict
    llm_payload:     str
    recommendations: list[str]
    risk_flags:      list[str]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
async def cv_status():
    return {"cv_available": CV_AVAILABLE}


@router.post("/analyze", response_model=CVAnalyzeResponse)
async def analyze(
    body: CVAnalyzeRequest,
    user_id: str = Depends(get_current_user),
):
    result = analyze_frame(
        webcam_b64=body.webcam_frame_b64,
        env_b64=body.env_frame_b64,
    )

    persisted = False
    if result["cv_available"]:
        try:
            supabase.table("cv_scores").upsert({
                "user_id":                 user_id,
                "physical_wellness_score": result["physical_wellness_score"],
                "digital_context_score":   result["digital_context_score"],
                "distraction_risk_score":  result["distraction_risk_score"],
                "posture_score":           result["posture"]["posture_score"],
                "eye_strain_score":        result["posture"]["eye_strain_score"],
                "blink_rate_rpm":          result["posture"]["blink_rate_rpm"],
                "environment_context":     result["environment"]["context"],
                "anxiety_score":           result["anxiety"]["anxiety_score"],
                "stress_level":            result["anxiety"]["stress_level"],
                "shoulder_tension":        result["posture"]["shoulder_tension"],
            }).execute()
            persisted = True
        except Exception:
            pass

    return CVAnalyzeResponse(
        cv_available=result["cv_available"],
        physical_wellness_score=result["physical_wellness_score"],
        digital_context_score=result["digital_context_score"],
        distraction_risk_score=result["distraction_risk_score"],
        posture=PostureOut(**result["posture"]),
        environment=EnvironmentOut(**result["environment"]),
        anxiety=AnxietyOut(**result["anxiety"]),
        object_scores=[ObjectScoreOut(**o) for o in result["object_scores"]],
        pose_landmarks=[PoseLandmarkOut(**lm) for lm in result["pose_landmarks"]],
        persisted=persisted,
    )


@router.post("/report", response_model=SessionReportResponse)
async def session_report(
    body: SessionReportRequest,
    user_id: str = Depends(get_current_user),
):
    """Genera un reporte estructurado de sesión y un payload para LLM doctor."""
    snaps = body.snapshots
    if not snaps:
        return SessionReportResponse(
            summary={}, llm_payload="Sin datos suficientes.", recommendations=[], risk_flags=[]
        )

    import statistics

    def avg(vals): return round(statistics.mean(vals), 3) if vals else 0.0
    def peak(vals): return round(max(vals), 3) if vals else 0.0

    posture_vals    = [s.posture_score    for s in snaps]
    anxiety_vals    = [s.anxiety_score    for s in snaps]
    eye_strain_vals = [s.eye_strain_score for s in snaps]
    blink_vals      = [s.blink_rate_rpm   for s in snaps]
    shoulder_vals   = [s.shoulder_tension for s in snaps]
    distraction_vals= [s.distraction_risk for s in snaps]
    face_touch_vals = [s.face_touch_rate  for s in snaps]

    stress_counts   = {"low": 0, "medium": 0, "high": 0}
    for s in snaps:
        stress_counts[s.stress_level] = stress_counts.get(s.stress_level, 0) + 1
    dominant_stress = max(stress_counts, key=stress_counts.get)

    env_counts: dict[str, int] = {}
    for s in snaps:
        env_counts[s.environment_context] = env_counts.get(s.environment_context, 0) + 1
    dominant_env = max(env_counts, key=env_counts.get) if env_counts else "unknown"

    summary = {
        "duration_minutes":       round(body.duration_seconds / 60, 1),
        "total_frames_analyzed":  body.total_frames,
        "avg_posture_score":      avg(posture_vals),
        "avg_anxiety_score":      avg(anxiety_vals),
        "peak_anxiety_score":     peak(anxiety_vals),
        "avg_eye_strain":         avg(eye_strain_vals),
        "avg_blink_rate_rpm":     avg(blink_vals),
        "avg_shoulder_tension":   avg(shoulder_vals),
        "avg_distraction_risk":   avg(distraction_vals),
        "avg_face_touch_rate":    avg(face_touch_vals),
        "dominant_stress_level":  dominant_stress,
        "dominant_environment":   dominant_env,
        "stress_distribution":    stress_counts,
        "objects_detected":       [o.dict() for o in body.object_interactions],
    }

    risk_flags  = _compute_risk_flags(summary)
    recs        = _compute_recommendations(summary, risk_flags)
    llm_payload = _build_llm_payload(summary, risk_flags, body.object_interactions)

    return SessionReportResponse(
        summary=summary,
        llm_payload=llm_payload,
        recommendations=recs,
        risk_flags=risk_flags,
    )


def _compute_risk_flags(s: dict) -> list[str]:
    flags = []
    if s["avg_anxiety_score"] > 0.55:
        flags.append("ANXIETY_HIGH")
    if s["peak_anxiety_score"] > 0.75:
        flags.append("ANXIETY_PEAK_CRITICAL")
    if s["avg_eye_strain"] > 0.60:
        flags.append("EYE_STRAIN_HIGH")
    if s["avg_blink_rate_rpm"] < 10:
        flags.append("BLINK_RATE_LOW")
    if s["avg_posture_score"] < 0.45:
        flags.append("POSTURE_POOR")
    if s["avg_shoulder_tension"] > 0.55:
        flags.append("SHOULDER_TENSION_HIGH")
    if s["avg_face_touch_rate"] > 4.0:
        flags.append("FACE_TOUCHING_HIGH")
    if s["dominant_environment"] == "bedroom":
        flags.append("NOCTURNAL_WORK_PATTERN")
    if s["avg_distraction_risk"] > 0.60:
        flags.append("HIGH_DISTRACTION_RISK")
    return flags


def _compute_recommendations(summary: dict, flags: list[str]) -> list[str]:
    recs = []
    if "EYE_STRAIN_HIGH" in flags or "BLINK_RATE_LOW" in flags:
        recs.append("Aplica la regla 20-20-20: cada 20 min, mira a 6m por 20 segundos.")
    if "POSTURE_POOR" in flags:
        recs.append("Ajusta la altura del monitor al nivel de los ojos y asienta la espalda.")
    if "SHOULDER_TENSION_HIGH" in flags:
        recs.append("Realiza ejercicios de rotación de hombros cada 30 minutos.")
    if "ANXIETY_HIGH" in flags or "FACE_TOUCHING_HIGH" in flags:
        recs.append("Practica respiración 4-7-8 (inhala 4s, retén 7s, exhala 8s).")
    if "ANXIETY_PEAK_CRITICAL" in flags:
        recs.append("Se detectaron picos de ansiedad. Considera técnicas de grounding (5-4-3-2-1).")
    if "HIGH_DISTRACTION_RISK" in flags:
        recs.append("Usa un bloqueador de distracciones y activa modo focus/DND.")
    if "NOCTURNAL_WORK_PATTERN" in flags:
        recs.append("Evitar trabajo nocturno en cama — afecta el ritmo circadiano.")
    if not recs:
        recs.append("Sesión sin alertas importantes. Mantén los hábitos actuales.")
    return recs


def _build_llm_payload(summary: dict, flags: list[str], objects: list) -> str:
    obj_lines = "\n".join(
        f"  - {o.label} ({o.category}): productividad {o.productivity_score:.0%}, distracción {o.distraction_score:.0%}, detectado {o.frames_detected} veces"
        for o in objects
    ) or "  Ninguno significativo"

    return f"""## Reporte de Sesión de Bienestar Digital — Kairós

**Duración:** {summary['duration_minutes']} minutos | **Frames analizados:** {summary['total_frames_analyzed']}

### Métricas de Postura
- Postura promedio: {summary['avg_posture_score']:.0%}
- Tensión de hombros: {summary['avg_shoulder_tension']:.0%}

### Métricas de Estrés y Ansiedad
- Score de ansiedad promedio: {summary['avg_anxiety_score']:.0%}
- Pico de ansiedad: {summary['peak_anxiety_score']:.0%}
- Nivel de estrés dominante: {summary['dominant_stress_level']}
- Distribución de estrés: bajo={summary['stress_distribution'].get('low',0)}, medio={summary['stress_distribution'].get('medium',0)}, alto={summary['stress_distribution'].get('high',0)} frames
- Toques de cara: {summary['avg_face_touch_rate']:.1f}/min

### Fatiga Visual
- Eye strain promedio: {summary['avg_eye_strain']:.0%}
- Tasa de parpadeo: {summary['avg_blink_rate_rpm']:.1f} parpadeos/min (normal: 12–20)

### Entorno y Contexto
- Entorno predominante: {summary['dominant_environment']}
- Riesgo de distracción: {summary['avg_distraction_risk']:.0%}

### Objetos Detectados
{obj_lines}

### Flags de Riesgo Detectados
{chr(10).join(f'- {f}' for f in flags) if flags else '- Ninguno'}

---
*Por favor, analiza estos datos como médico especialista en salud digital y proporciona:
1. Evaluación clínica del estado de bienestar del usuario
2. Indicadores de estrés o ansiedad relevantes
3. Recomendaciones médicas específicas
4. Señales que ameriten derivación profesional*
"""
