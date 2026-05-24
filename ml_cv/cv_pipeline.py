"""
CV Pipeline — unified entry point for all computer vision models.

Combines MediaPipe + YOLOv8n + SAM2 into a single scored output
consumed by the triage agent in Fase 3.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from ml_cv.mediapipe.posture_analyzer import PostureAnalyzer, PostureResult
from ml_cv.yolo.environment_detector import EnvironmentDetector, EnvironmentResult
from ml_cv.sam2.screen_segmenter import ScreenSegmenter, SegmentationResult

logger = logging.getLogger(__name__)


@dataclass
class CVPipelineResult:
    posture: PostureResult
    environment: EnvironmentResult
    screen: SegmentationResult
    # Derived composite scores
    physical_wellness_score: float = 0.5   # 1 = great posture, low strain
    digital_context_score: float = 0.5    # 1 = productive environment
    distraction_risk_score: float = 0.0   # 1 = high distraction risk


class CVPipeline:
    """Phase 3 CV pipeline — instantiate once, reuse across frames."""

    def __init__(self, device: str = "cpu") -> None:
        self.posture = PostureAnalyzer()
        self.env = EnvironmentDetector()
        self.screen = ScreenSegmenter(device=device)

    def process(
        self,
        webcam_frame: np.ndarray | None = None,
        env_frame: np.ndarray | None = None,
        screenshot: np.ndarray | None = None,
    ) -> CVPipelineResult:
        """Run all available CV models on the provided frames.

        Any frame can be None — that model will return neutral scores.
        """
        posture_r = self.posture.analyze_frame(webcam_frame) if webcam_frame is not None else PostureResult()
        env_r = self.env.detect(env_frame) if env_frame is not None else EnvironmentResult()
        screen_r = self.screen.segment_screen(screenshot) if screenshot is not None else SegmentationResult()

        physical = float(np.clip(
            posture_r.posture_score * 0.5
            + (1 - posture_r.eye_strain_score) * 0.3
            + (1 - min(posture_r.head_tilt_deg / 30, 1)) * 0.2,
            0, 1
        ))

        digital = float(np.clip(
            (1.0 if env_r.context == "workspace" else 0.4) * 0.6
            + (1 - screen_r.distractor_ratio) * 0.4,
            0, 1
        ))

        distraction = float(np.clip(
            screen_r.distractor_ratio * 0.5
            + (0.8 if env_r.context == "bedroom" else 0.0) * 0.3
            + posture_r.eye_strain_score * 0.2,
            0, 1
        ))

        return CVPipelineResult(
            posture=posture_r,
            environment=env_r,
            screen=screen_r,
            physical_wellness_score=round(physical, 4),
            digital_context_score=round(digital, 4),
            distraction_risk_score=round(distraction, 4),
        )

    def release(self) -> None:
        self.posture.release()
