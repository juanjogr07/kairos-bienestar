"""
AnxietyDetector — Detecta indicadores de ansiedad/estrés a partir de
series de tiempo de landmarks de pose y face.

Métricas producidas:
  anxiety_score       float [0,1]   score compuesto
  stress_level        str           "low" | "medium" | "high"
  face_touch_rate     float         toques cara/minuto (últimos 60s)
  head_movement_rate  float         velocidad cabeza (norm.)
  postural_sway       float [0,1]   varianza de posición corporal
  shoulder_tension    float [0,1]   promedio de tensión de hombros
  fidget_score        float [0,1]   movimiento corporal general
  indicators          list[str]     indicadores activos legibles
"""
from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger(__name__)

# Umbrales configurables
FACE_TOUCH_DIST_THRESHOLD = 0.18   # fracción de frame, muñeca ≤ esto = toque
HEAD_MOVEMENT_HIGH        = 0.012  # velocidad normalizada alta
HEAD_MOVEMENT_MED         = 0.006
FIDGET_HIGH               = 0.010
FIDGET_MED                = 0.005
SHOULDER_TENSION_HIGH     = 0.55
SWAY_HIGH                 = 0.0008


@dataclass
class AnxietyResult:
    anxiety_score: float      = 0.0
    stress_level: str         = "low"
    face_touch_rate: float    = 0.0   # toques/minuto
    head_movement_rate: float = 0.0
    postural_sway: float      = 0.0
    shoulder_tension: float   = 0.0
    fidget_score: float       = 0.0
    indicators: list[str]     = field(default_factory=list)


class AnxietyDetector:
    """
    Recibe actualizaciones frame a frame y mantiene buffers deslizantes
    para calcular métricas de ansiedad/estrés.

    Uso:
        detector = AnxietyDetector()
        # por cada frame:
        result = detector.update(posture_result)
    """

    BUFFER_SIZE   = 30   # ~3s a 10fps
    LONG_BUFFER   = 300  # ~30s para face_touch_rate

    def __init__(self) -> None:
        # Buffers de series de tiempo
        self._head_positions:   deque[tuple[float, float]] = deque(maxlen=self.BUFFER_SIZE)
        self._hip_positions:    deque[tuple[float, float]] = deque(maxlen=self.BUFFER_SIZE)
        self._shoulder_tension: deque[float]               = deque(maxlen=self.BUFFER_SIZE)
        self._movement_rates:   deque[float]               = deque(maxlen=self.BUFFER_SIZE)

        # Face touch tracking
        self._frame_count           = 0
        self._face_touch_frames:    deque[int] = deque(maxlen=self.LONG_BUFFER)
        self._fps_estimate          = 10.0
        self._in_face_touch         = False

    def update(self, posture) -> AnxietyResult:
        """
        Recibe un PostureResult y retorna un AnxietyResult actualizado.
        posture debe tener: pose_landmarks, shoulder_tension, body_movement_rate, wrist_face_distance.
        """
        self._frame_count += 1
        result = AnxietyResult()

        lms = getattr(posture, "pose_landmarks", [])

        # ── 1. Posición de cabeza (nariz) y cadera ─────────────────────────
        if len(lms) > 24:
            nose = lms[0]
            self._head_positions.append((nose.x, nose.y))

            l_hip, r_hip = lms[23], lms[24]
            hip_x = (l_hip.x + r_hip.x) / 2.0
            hip_y = (l_hip.y + r_hip.y) / 2.0
            self._hip_positions.append((hip_x, hip_y))

        # ── 2. Shoulder tension ────────────────────────────────────────────
        tension = getattr(posture, "shoulder_tension", 0.0)
        self._shoulder_tension.append(tension)

        # ── 3. Body movement / fidget ──────────────────────────────────────
        mvr = getattr(posture, "body_movement_rate", 0.0)
        self._movement_rates.append(mvr)

        # ── 4. Face touch detection ────────────────────────────────────────
        wfd = getattr(posture, "wrist_face_distance", 1.0)
        if wfd <= FACE_TOUCH_DIST_THRESHOLD and not self._in_face_touch:
            self._face_touch_frames.append(self._frame_count)
            self._in_face_touch = True
        elif wfd > FACE_TOUCH_DIST_THRESHOLD:
            self._in_face_touch = False

        # ── Calcula métricas ───────────────────────────────────────────────
        result.face_touch_rate    = self._compute_face_touch_rate()
        result.head_movement_rate = self._compute_head_movement()
        result.postural_sway      = self._compute_sway()
        result.shoulder_tension   = round(float(np.mean(self._shoulder_tension)) if self._shoulder_tension else 0.0, 4)
        result.fidget_score       = self._compute_fidget()
        result.indicators         = self._build_indicators(result)
        result.anxiety_score      = self._compute_anxiety_score(result)
        result.stress_level       = _score_to_level(result.anxiety_score)

        return result

    # ── Cálculos internos ──────────────────────────────────────────────────

    def _compute_face_touch_rate(self) -> float:
        """Toques de cara por minuto en ventana deslizante."""
        if len(self._face_touch_frames) < 1:
            return 0.0
        window_frames  = self._frame_count - self._face_touch_frames[0]
        window_minutes = max(window_frames / (self._fps_estimate * 60), 1e-6)
        return round(len(self._face_touch_frames) / window_minutes, 2)

    def _compute_head_movement(self) -> float:
        """Velocidad promedio de la cabeza (norma del desplazamiento entre frames)."""
        if len(self._head_positions) < 2:
            return 0.0
        arr   = np.array(self._head_positions)
        diffs = np.linalg.norm(np.diff(arr, axis=0), axis=1)
        return round(float(np.mean(diffs)), 5)

    def _compute_sway(self) -> float:
        """Varianza de la posición de la cadera — inestabilidad postural."""
        if len(self._hip_positions) < 4:
            return 0.0
        arr = np.array(self._hip_positions)
        var = float(np.var(arr[:, 0]) + np.var(arr[:, 1]))
        # Normalizar a 0-1 con umbral práctico
        return round(float(np.clip(var / 0.004, 0, 1)), 4)

    def _compute_fidget(self) -> float:
        """Score de movimiento corporal general normalizado 0-1."""
        if not self._movement_rates:
            return 0.0
        avg = float(np.mean(self._movement_rates))
        return round(float(np.clip(avg / 0.02, 0, 1)), 4)

    def _build_indicators(self, r: AnxietyResult) -> list[str]:
        indicators = []
        if r.face_touch_rate > 3.0:
            indicators.append("face_touching_frequent")
        elif r.face_touch_rate > 1.0:
            indicators.append("face_touching_occasional")
        if r.head_movement_rate > HEAD_MOVEMENT_HIGH:
            indicators.append("head_restlessness_high")
        elif r.head_movement_rate > HEAD_MOVEMENT_MED:
            indicators.append("head_restlessness_moderate")
        if r.postural_sway > 0.6:
            indicators.append("postural_instability")
        if r.shoulder_tension > SHOULDER_TENSION_HIGH:
            indicators.append("shoulder_tension_high")
        elif r.shoulder_tension > 0.3:
            indicators.append("shoulder_tension_moderate")
        if r.fidget_score > FIDGET_HIGH / 0.02:
            indicators.append("body_fidgeting")
        return indicators

    def _compute_anxiety_score(self, r: AnxietyResult) -> float:
        """Score ponderado de ansiedad 0-1."""
        score = (
            min(r.face_touch_rate / 6.0, 1.0)   * 0.30
            + min(r.head_movement_rate / 0.015, 1.0) * 0.20
            + r.postural_sway                    * 0.20
            + r.shoulder_tension                 * 0.20
            + r.fidget_score                     * 0.10
        )
        return round(float(np.clip(score, 0, 1)), 4)


def _score_to_level(score: float) -> str:
    if score < 0.25:
        return "low"
    if score < 0.55:
        return "medium"
    return "high"


# Etiquetas legibles en español para el frontend
INDICATOR_LABELS: dict[str, str] = {
    "face_touching_frequent":    "Toca la cara frecuentemente",
    "face_touching_occasional":  "Toca la cara ocasionalmente",
    "head_restlessness_high":    "Movimiento de cabeza elevado",
    "head_restlessness_moderate":"Movimiento de cabeza moderado",
    "postural_instability":      "Inestabilidad postural",
    "shoulder_tension_high":     "Hombros muy tensos/elevados",
    "shoulder_tension_moderate": "Tensión leve en hombros",
    "body_fidgeting":            "Inquietud corporal (fidgeting)",
}
