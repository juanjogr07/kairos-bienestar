"""
CV Service — wraps ml_cv.CVPipeline for use from api-service.

Adds the project root to sys.path so `ml_cv` is importable,
then exposes a simple analyze_frame() function with graceful fallback.
"""
from __future__ import annotations

import base64
import logging
import sys
from dataclasses import asdict
from pathlib import Path

import numpy as np

# Inject project root so `import ml_cv` works
_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

logger = logging.getLogger(__name__)

try:
    from ml_cv.cv_pipeline import CVPipeline, CVPipelineResult
    _pipeline: CVPipeline | None = CVPipeline()
    CV_AVAILABLE = True
    logger.info("CVPipeline initialized (MediaPipe + YOLO + SAM2)")
except Exception as exc:
    _pipeline = None
    CV_AVAILABLE = False
    logger.warning("CVPipeline unavailable (%s) — returning neutral scores", exc)


def _neutral_result() -> dict:
    return {
        "cv_available": False,
        "physical_wellness_score": 0.5,
        "digital_context_score": 0.5,
        "distraction_risk_score": 0.0,
        "posture": {
            "posture_score": 0.5,
            "eye_strain_score": 0.0,
            "blink_rate_rpm": 15.0,
            "head_tilt_deg": 0.0,
            "landmarks_detected": False,
        },
        "environment": {
            "context": "unknown",
            "confidence": 0.0,
            "detected_objects": [],
            "boxes": [],
        },
    }


def analyze_frame(
    webcam_b64: str | None = None,
    env_b64: str | None = None,
) -> dict:
    """Decode base64 JPEG/PNG frames and run CVPipeline.

    Any frame can be None — that sub-model returns neutral scores.
    Always returns a dict (never raises).
    """
    if not CV_AVAILABLE or _pipeline is None:
        return _neutral_result()

    try:
        import cv2  # type: ignore

        def _decode(b64: str) -> np.ndarray:
            raw = base64.b64decode(b64)
            arr = np.frombuffer(raw, dtype=np.uint8)
            img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        webcam = _decode(webcam_b64) if webcam_b64 else None
        env = _decode(env_b64) if env_b64 else None

        result = _pipeline.process(webcam_frame=webcam, env_frame=env)
        return {
            "cv_available": True,
            "physical_wellness_score": result.physical_wellness_score,
            "digital_context_score": result.digital_context_score,
            "distraction_risk_score": result.distraction_risk_score,
            "posture": {
                "posture_score": result.posture.posture_score,
                "eye_strain_score": result.posture.eye_strain_score,
                "blink_rate_rpm": result.posture.blink_rate_rpm,
                "head_tilt_deg": result.posture.head_tilt_deg,
                "landmarks_detected": result.posture.landmarks_detected,
            },
            "environment": {
                "context": result.environment.context,
                "confidence": result.environment.confidence,
                "detected_objects": result.environment.detected_objects,
                "boxes": [
                    {"label": b.label, "confidence": b.confidence,
                     "x1": b.x1, "y1": b.y1, "x2": b.x2, "y2": b.y2}
                    for b in result.environment.boxes
                ],
            },
        }
    except Exception as exc:
        logger.error("CV analyze_frame failed: %s", exc)
        return _neutral_result()
