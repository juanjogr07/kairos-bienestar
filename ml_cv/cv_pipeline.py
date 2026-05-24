"""
CV Pipeline — unified entry point for all computer vision models.

Combina MediaPipe Pose + FaceMesh + YOLOv8n + AnxietyDetector.
Retorna pose_landmarks (exoesqueleto), métricas de ansiedad/estrés,
y scoring por objeto para el reporte de sesión.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np

from ml_cv.mediapipe.posture_analyzer import PostureAnalyzer, PostureResult, PoseLandmark
from ml_cv.mediapipe.anxiety_detector import AnxietyDetector, AnxietyResult
from ml_cv.yolo.environment_detector import EnvironmentDetector, EnvironmentResult
from ml_cv.sam2.screen_segmenter import ScreenSegmenter, SegmentationResult

logger = logging.getLogger(__name__)

# Scoring por objeto detectado por YOLO.
# Cubre el vocabulario de YOLO-World (CUSTOM_VOCABULARY) más aliases COCO.
OBJECT_META: dict[str, dict] = {
    # ── Celulares / smartphones (todos los aliases) ──
    "cell phone":    {"category": "distraction",   "productivity": 0.05, "distraction": 0.95},
    "mobile phone":  {"category": "distraction",   "productivity": 0.05, "distraction": 0.95},
    "smartphone":    {"category": "distraction",   "productivity": 0.05, "distraction": 0.95},
    "phone":         {"category": "distraction",   "productivity": 0.05, "distraction": 0.95},
    # ── Herramientas de trabajo ──
    "laptop":        {"category": "work_tool",     "productivity": 0.85, "distraction": 0.20},
    "keyboard":      {"category": "work_tool",     "productivity": 0.80, "distraction": 0.10},
    "mouse":         {"category": "work_tool",     "productivity": 0.75, "distraction": 0.10},
    "monitor":       {"category": "work_tool",     "productivity": 0.80, "distraction": 0.25},
    "desktop computer": {"category": "work_tool",  "productivity": 0.80, "distraction": 0.20},
    "tablet":        {"category": "work_tool",     "productivity": 0.65, "distraction": 0.40},
    "calculator":    {"category": "work_tool",     "productivity": 0.85, "distraction": 0.05},
    "printer":       {"category": "work_tool",     "productivity": 0.70, "distraction": 0.05},
    "projector":     {"category": "work_tool",     "productivity": 0.80, "distraction": 0.10},
    "webcam":        {"category": "work_tool",     "productivity": 0.75, "distraction": 0.10},
    # ── Estudio ──
    "book":          {"category": "study_tool",    "productivity": 0.90, "distraction": 0.05},
    "notebook":      {"category": "study_tool",    "productivity": 0.90, "distraction": 0.05},
    "whiteboard":    {"category": "study_tool",    "productivity": 0.85, "distraction": 0.05},
    "folder":        {"category": "study_tool",    "productivity": 0.70, "distraction": 0.05},
    "binder":        {"category": "study_tool",    "productivity": 0.70, "distraction": 0.05},
    # ── Papelería ──
    "pen":           {"category": "stationery",    "productivity": 0.75, "distraction": 0.05},
    "pencil":        {"category": "stationery",    "productivity": 0.75, "distraction": 0.05},
    "scissors":      {"category": "stationery",    "productivity": 0.60, "distraction": 0.05},
    "sticky notes":  {"category": "stationery",    "productivity": 0.65, "distraction": 0.05},
    # ── Entretenimiento / distracción ──
    "television":    {"category": "distraction",   "productivity": 0.00, "distraction": 0.95},
    "tv":            {"category": "distraction",   "productivity": 0.00, "distraction": 0.95},
    "remote control": {"category": "leisure",      "productivity": 0.00, "distraction": 0.80},
    "remote":        {"category": "leisure",       "productivity": 0.00, "distraction": 0.80},
    "game controller": {"category": "leisure",     "productivity": 0.00, "distraction": 0.90},
    "video game console": {"category": "leisure",  "productivity": 0.00, "distraction": 0.92},
    "headphones":    {"category": "entertainment", "productivity": 0.55, "distraction": 0.30},
    "earphones":     {"category": "entertainment", "productivity": 0.55, "distraction": 0.30},
    # ── Bienestar ──
    "cup":           {"category": "wellness",      "productivity": 0.10, "distraction": 0.00},
    "mug":           {"category": "wellness",      "productivity": 0.10, "distraction": 0.00},
    "bottle":        {"category": "wellness",      "productivity": 0.10, "distraction": 0.00},
    "water bottle":  {"category": "wellness",      "productivity": 0.10, "distraction": 0.00},
    "food":          {"category": "wellness",      "productivity": 0.15, "distraction": 0.10},
    "snack":         {"category": "wellness",      "productivity": 0.10, "distraction": 0.15},
    # ── Entorno / muebles ──
    "chair":         {"category": "environment",   "productivity": 0.50, "distraction": 0.10},
    "desk":          {"category": "environment",   "productivity": 0.60, "distraction": 0.05},
    "table":         {"category": "environment",   "productivity": 0.45, "distraction": 0.10},
    "lamp":          {"category": "environment",   "productivity": 0.30, "distraction": 0.00},
    "desk lamp":     {"category": "environment",   "productivity": 0.35, "distraction": 0.00},
    "plant":         {"category": "environment",   "productivity": 0.20, "distraction": 0.00},
    # ── Ocio / descanso ──
    "couch":         {"category": "leisure",       "productivity": 0.10, "distraction": 0.60},
    "sofa":          {"category": "leisure",       "productivity": 0.10, "distraction": 0.60},
    "bed":           {"category": "leisure",       "productivity": 0.00, "distraction": 0.90},
    # ── Objetos personales ──
    "backpack":      {"category": "personal",      "productivity": 0.30, "distraction": 0.05},
    "bag":           {"category": "personal",      "productivity": 0.20, "distraction": 0.05},
    "glasses":       {"category": "personal",      "productivity": 0.10, "distraction": 0.00},
    "watch":         {"category": "personal",      "productivity": 0.10, "distraction": 0.05},
}

DEFAULT_OBJECT_META = {"category": "unknown", "productivity": 0.40, "distraction": 0.20}

# Labels que indican presencia de celular/smartphone (todos los aliases)
PHONE_LABELS: frozenset[str] = frozenset({
    "cell phone", "mobile phone", "smartphone", "phone",
})


@dataclass
class ObjectScore:
    label: str
    category: str
    productivity_score: float
    distraction_score: float
    count: int = 1


@dataclass
class CVPipelineResult:
    posture: PostureResult
    environment: EnvironmentResult
    screen: SegmentationResult
    anxiety: AnxietyResult
    object_scores: list[ObjectScore] = field(default_factory=list)
    pose_landmarks: list[PoseLandmark] = field(default_factory=list)
    phones_detected: list[str] = field(default_factory=list)  # aliases de celular visibles
    # Composite scores
    physical_wellness_score: float = 0.5
    digital_context_score: float   = 0.5
    distraction_risk_score: float  = 0.0


class CVPipeline:
    """Phase 3 CV pipeline — instanciar una vez, reutilizar por frames."""

    def __init__(self, device: str = "cpu") -> None:
        self.posture = PostureAnalyzer()
        self.env     = EnvironmentDetector()
        self.screen  = ScreenSegmenter(device=device)
        self.anxiety = AnxietyDetector()

    def process(
        self,
        webcam_frame: np.ndarray | None = None,
        env_frame: np.ndarray | None    = None,
        screenshot: np.ndarray | None   = None,
    ) -> CVPipelineResult:
        posture_r = self.posture.analyze_frame(webcam_frame) if webcam_frame is not None else PostureResult()
        env_r     = self.env.detect(env_frame if env_frame is not None else webcam_frame)  # usa webcam si no hay env
        screen_r  = self.screen.segment_screen(screenshot) if screenshot is not None else SegmentationResult()
        anxiety_r = self.anxiety.update(posture_r)

        # Object scoring desde detecciones YOLO
        obj_scores = self._score_objects(env_r)

        # Celulares detectados (todos los aliases)
        phones = [
            label for label in env_r.detected_objects
            if label.lower() in PHONE_LABELS
        ]

        # Composite scores
        physical = float(np.clip(
            posture_r.posture_score      * 0.40
            + (1 - posture_r.eye_strain_score) * 0.25
            + (1 - min(abs(posture_r.head_tilt_deg) / 30, 1)) * 0.15
            + (1 - posture_r.shoulder_tension) * 0.10
            + (1 - anxiety_r.anxiety_score)    * 0.10,
            0, 1
        ))

        # Distraction ajustado por objetos presentes; celular suma bonus
        obj_distraction = float(np.mean([o.distraction_score for o in obj_scores])) if obj_scores else 0.2
        phone_bonus = 0.15 if phones else 0.0   # celular visible sube distracción
        digital = float(np.clip(
            (1.0 if env_r.context == "workspace" else 0.4) * 0.50
            + (1 - obj_distraction)  * 0.30
            + (1 - screen_r.distractor_ratio) * 0.20,
            0, 1
        ))

        distraction = float(np.clip(
            obj_distraction              * 0.35
            + screen_r.distractor_ratio  * 0.25
            + (0.8 if env_r.context == "bedroom" else 0.0) * 0.20
            + posture_r.eye_strain_score * 0.10
            + anxiety_r.anxiety_score    * 0.10
            + phone_bonus,
            0, 1
        ))

        return CVPipelineResult(
            posture=posture_r,
            environment=env_r,
            screen=screen_r,
            anxiety=anxiety_r,
            object_scores=obj_scores,
            pose_landmarks=posture_r.pose_landmarks,
            phones_detected=phones,
            physical_wellness_score=round(physical, 4),
            digital_context_score=round(digital, 4),
            distraction_risk_score=round(distraction, 4),
        )

    def _score_objects(self, env_r: EnvironmentResult) -> list[ObjectScore]:
        scores: dict[str, ObjectScore] = {}
        # Preferir category del box (derivada de OBJECT_TYPE_MAP en el detector)
        # si no hay box para ese label, caer en OBJECT_META
        box_types: dict[str, str] = {b.label.lower(): b.object_type for b in env_r.boxes}
        for label in env_r.detected_objects:
            key = label.lower()
            meta = OBJECT_META.get(key, OBJECT_META.get(label, DEFAULT_OBJECT_META))
            category = box_types.get(key, meta["category"])
            if key in scores:
                scores[key].count += 1
            else:
                scores[key] = ObjectScore(
                    label=label,
                    category=category,
                    productivity_score=meta["productivity"],
                    distraction_score=meta["distraction"],
                )
        return list(scores.values())

    def release(self) -> None:
        self.posture.release()
