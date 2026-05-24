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

# Scoring por objeto detectado por YOLO
OBJECT_META: dict[str, dict] = {
    "laptop":      {"category": "work_tool",   "productivity": 0.85, "distraction": 0.20},
    "keyboard":    {"category": "work_tool",   "productivity": 0.80, "distraction": 0.10},
    "mouse":       {"category": "work_tool",   "productivity": 0.75, "distraction": 0.10},
    "monitor":     {"category": "work_tool",   "productivity": 0.80, "distraction": 0.25},
    "book":        {"category": "study_tool",  "productivity": 0.90, "distraction": 0.05},
    "cell phone":  {"category": "distraction", "productivity": 0.05, "distraction": 0.95},
    "remote":      {"category": "leisure",     "productivity": 0.00, "distraction": 0.80},
    "scissors":    {"category": "stationery",  "productivity": 0.60, "distraction": 0.05},
    "pen":         {"category": "stationery",  "productivity": 0.75, "distraction": 0.05},
    "pencil":      {"category": "stationery",  "productivity": 0.75, "distraction": 0.05},
    "notebook":    {"category": "study_tool",  "productivity": 0.90, "distraction": 0.05},
    "cup":         {"category": "wellness",    "productivity": 0.10, "distraction": 0.00},
    "bottle":      {"category": "wellness",    "productivity": 0.10, "distraction": 0.00},
    "chair":       {"category": "environment", "productivity": 0.50, "distraction": 0.10},
    "couch":       {"category": "leisure",     "productivity": 0.10, "distraction": 0.60},
    "bed":         {"category": "leisure",     "productivity": 0.00, "distraction": 0.90},
    "tv":          {"category": "distraction", "productivity": 0.00, "distraction": 0.95},
}

DEFAULT_OBJECT_META = {"category": "unknown", "productivity": 0.40, "distraction": 0.20}


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

        # Composite scores
        physical = float(np.clip(
            posture_r.posture_score      * 0.40
            + (1 - posture_r.eye_strain_score) * 0.25
            + (1 - min(abs(posture_r.head_tilt_deg) / 30, 1)) * 0.15
            + (1 - posture_r.shoulder_tension) * 0.10
            + (1 - anxiety_r.anxiety_score)    * 0.10,
            0, 1
        ))

        # Distraction ajustado por objetos presentes
        obj_distraction = float(np.mean([o.distraction_score for o in obj_scores])) if obj_scores else 0.2
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
            + anxiety_r.anxiety_score    * 0.10,
            0, 1
        ))

        return CVPipelineResult(
            posture=posture_r,
            environment=env_r,
            screen=screen_r,
            anxiety=anxiety_r,
            object_scores=obj_scores,
            pose_landmarks=posture_r.pose_landmarks,
            physical_wellness_score=round(physical, 4),
            digital_context_score=round(digital, 4),
            distraction_risk_score=round(distraction, 4),
        )

    def _score_objects(self, env_r: EnvironmentResult) -> list[ObjectScore]:
        scores: dict[str, ObjectScore] = {}
        for label in env_r.detected_objects:
            meta = OBJECT_META.get(label, DEFAULT_OBJECT_META)
            if label in scores:
                scores[label].count += 1
            else:
                scores[label] = ObjectScore(
                    label=label,
                    category=meta["category"],
                    productivity_score=meta["productivity"],
                    distraction_score=meta["distraction"],
                )
        return list(scores.values())

    def release(self) -> None:
        self.posture.release()
