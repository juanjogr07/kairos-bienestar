"""
CV Service — wraps ml_cv.CVPipeline for use from api-service.
"""
from __future__ import annotations

import base64
import logging
import sys
from pathlib import Path

import numpy as np

_ROOT = Path(__file__).parent.parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

logger = logging.getLogger(__name__)

try:
    from ml_cv.cv_pipeline import CVPipeline, CVPipelineResult
    _pipeline: CVPipeline | None = CVPipeline()
    CV_AVAILABLE = True
    logger.info("CVPipeline initialized (MediaPipe + YOLO + AnxietyDetector)")
except Exception as exc:
    _pipeline = None
    CV_AVAILABLE = False
    logger.warning("CVPipeline unavailable (%s) — returning neutral scores", exc)


def _neutral_result() -> dict:
    return {
        "cv_available": False,
        "physical_wellness_score": 0.5,
        "digital_context_score":   0.5,
        "distraction_risk_score":  0.0,
        "posture": {
            "posture_score":      0.5,
            "eye_strain_score":   0.0,
            "blink_rate_rpm":     15.0,
            "head_tilt_deg":      0.0,
            "landmarks_detected": False,
            "shoulder_tension":   0.0,
            "body_movement_rate": 0.0,
            "wrist_face_distance": 1.0,
        },
        "environment": {
            "context":          "unknown",
            "confidence":       0.0,
            "detected_objects": [],
            "boxes":            [],
        },
        "anxiety": {
            "anxiety_score":      0.0,
            "stress_level":       "low",
            "face_touch_rate":    0.0,
            "head_movement_rate": 0.0,
            "postural_sway":      0.0,
            "shoulder_tension":   0.0,
            "fidget_score":       0.0,
            "indicators":         [],
        },
        "object_scores":  [],
        "pose_landmarks": [],
    }


def analyze_frame(
    webcam_b64: str | None = None,
    env_b64: str | None    = None,
) -> dict:
    if not CV_AVAILABLE or _pipeline is None:
        return _neutral_result()

    try:
        import cv2  # type: ignore

        def _decode(b64: str) -> np.ndarray:
            raw    = base64.b64decode(b64)
            arr    = np.frombuffer(raw, dtype=np.uint8)
            img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        webcam = _decode(webcam_b64) if webcam_b64 else None
        env    = _decode(env_b64)    if env_b64    else None

        result = _pipeline.process(webcam_frame=webcam, env_frame=env)

        return {
            "cv_available": True,
            "physical_wellness_score": result.physical_wellness_score,
            "digital_context_score":   result.digital_context_score,
            "distraction_risk_score":  result.distraction_risk_score,
            "posture": {
                "posture_score":       result.posture.posture_score,
                "eye_strain_score":    result.posture.eye_strain_score,
                "blink_rate_rpm":      result.posture.blink_rate_rpm,
                "head_tilt_deg":       result.posture.head_tilt_deg,
                "landmarks_detected":  result.posture.landmarks_detected,
                "shoulder_tension":    result.posture.shoulder_tension,
                "body_movement_rate":  result.posture.body_movement_rate,
                "wrist_face_distance": result.posture.wrist_face_distance,
            },
            "environment": {
                "context":          result.environment.context,
                "confidence":       result.environment.confidence,
                "detected_objects": result.environment.detected_objects,
                "boxes": [
                    {"label": b.label, "confidence": b.confidence,
                     "x1": b.x1, "y1": b.y1, "x2": b.x2, "y2": b.y2}
                    for b in result.environment.boxes
                ],
            },
            "anxiety": {
                "anxiety_score":      result.anxiety.anxiety_score,
                "stress_level":       result.anxiety.stress_level,
                "face_touch_rate":    result.anxiety.face_touch_rate,
                "head_movement_rate": result.anxiety.head_movement_rate,
                "postural_sway":      result.anxiety.postural_sway,
                "shoulder_tension":   result.anxiety.shoulder_tension,
                "fidget_score":       result.anxiety.fidget_score,
                "indicators":         result.anxiety.indicators,
            },
            "object_scores": [
                {
                    "label":              o.label,
                    "category":           o.category,
                    "productivity_score": o.productivity_score,
                    "distraction_score":  o.distraction_score,
                    "count":              o.count,
                }
                for o in result.object_scores
            ],
            "pose_landmarks": [
                {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                for lm in result.pose_landmarks
            ],
        }
    except Exception as exc:
        logger.error("CV analyze_frame failed: %s", exc)
        return _neutral_result()
