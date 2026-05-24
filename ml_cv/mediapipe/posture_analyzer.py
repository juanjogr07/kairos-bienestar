"""
MediaPipe — Posture & Fatigue Analyzer  (Fase 3, on-device)

Detecta: postura al sentarse, eye strain, fatiga facial.
Corre en el cliente (browser extension con TFLite) o en el backend con webcam stream.
Este módulo es el backend processor — recibe frames como numpy arrays.

Outputs:
  posture_score     float [0,1]   1 = postura ideal
  eye_strain_score  float [0,1]   1 = alto strain
  blink_rate_rpm    float         blinks por minuto
  head_tilt_deg     float         grados de inclinación lateral
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

try:
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logger.warning("MediaPipe not installed — PostureAnalyzer will return neutral scores")


@dataclass
class PostureResult:
    posture_score: float = 0.5
    eye_strain_score: float = 0.0
    blink_rate_rpm: float = 15.0
    head_tilt_deg: float = 0.0
    landmarks_detected: bool = False
    raw: dict = field(default_factory=dict)


class PostureAnalyzer:
    """Stateful analyzer that processes webcam frames and tracks blink history."""

    FACE_MESH_LANDMARKS = 478
    LEFT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
    RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
    # Nose tip, chin, left ear, right ear — for head pose
    HEAD_POSE_INDICES = [1, 152, 234, 454]

    def __init__(self) -> None:
        self._face_mesh = None
        self._pose = None
        self._blink_history: list[float] = []
        self._frame_count = 0
        self._fps_estimate = 10.0

        if MEDIAPIPE_AVAILABLE:
            self._init_mediapipe()

    def _init_mediapipe(self) -> None:
        try:
            mp_face = mp.solutions.face_mesh
            self._face_mesh = mp_face.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            mp_pose_sol = mp.solutions.pose
            self._pose = mp_pose_sol.Pose(
                static_image_mode=False,
                model_complexity=0,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
        except Exception as e:
            logger.error("MediaPipe init failed: %s", e)

    def analyze_frame(self, frame_rgb: np.ndarray) -> PostureResult:
        """Process a single RGB frame (H×W×3 uint8).

        Returns PostureResult with all scores.
        """
        if not MEDIAPIPE_AVAILABLE or self._face_mesh is None:
            return PostureResult()

        self._frame_count += 1
        result = PostureResult()

        try:
            face_results = self._face_mesh.process(frame_rgb)
            if face_results.multi_face_landmarks:
                lm = face_results.multi_face_landmarks[0].landmark
                result.landmarks_detected = True
                result.eye_strain_score = self._compute_ear(lm)
                result.head_tilt_deg = self._compute_head_tilt(lm)
                self._track_blink(result.eye_strain_score)
                result.blink_rate_rpm = self._estimate_blink_rate()

            pose_results = self._pose.process(frame_rgb)
            if pose_results.pose_landmarks:
                result.posture_score = self._compute_posture_score(pose_results.pose_landmarks.landmark)

        except Exception as e:
            logger.debug("Frame analysis error: %s", e)

        return result

    def _compute_ear(self, landmarks: list) -> float:
        """Eye Aspect Ratio — lower EAR = more eye strain / fatigue."""
        def _ear_single(indices: list[int]) -> float:
            pts = np.array([[landmarks[i].x, landmarks[i].y] for i in indices])
            # vertical distances (top-bottom pairs)
            v1 = np.linalg.norm(pts[1] - pts[5])
            v2 = np.linalg.norm(pts[2] - pts[4])
            # horizontal distance
            h = np.linalg.norm(pts[0] - pts[3])
            return (v1 + v2) / (2.0 * h + 1e-8)

        ear_l = _ear_single(self.LEFT_EYE_INDICES[:6])
        ear_r = _ear_single(self.RIGHT_EYE_INDICES[:6])
        avg_ear = (ear_l + ear_r) / 2.0
        # Normal EAR ~0.3; strain score inverted: low EAR → high strain
        strain = float(np.clip(1.0 - (avg_ear / 0.3), 0, 1))
        return round(strain, 4)

    def _compute_head_tilt(self, landmarks: list) -> float:
        """Head tilt in degrees from vertical."""
        nose = np.array([landmarks[1].x, landmarks[1].y])
        chin = np.array([landmarks[152].x, landmarks[152].y])
        vec = chin - nose
        angle = float(np.degrees(np.arctan2(vec[0], vec[1])))
        return round(angle, 2)

    def _compute_posture_score(self, pose_lm: list) -> float:
        """Score based on shoulder alignment (symmetry + height)."""
        # MediaPipe pose: 11=left_shoulder, 12=right_shoulder
        ls = pose_lm[11]
        rs = pose_lm[12]
        # Shoulder height difference normalized
        height_diff = abs(ls.y - rs.y)
        score = float(np.clip(1.0 - height_diff * 10, 0, 1))
        return round(score, 4)

    def _track_blink(self, eye_strain: float) -> None:
        # Blink detected when strain spikes (EAR drops below threshold)
        if eye_strain > 0.8:
            self._blink_history.append(self._frame_count)
            # Keep last 60s of history
            cutoff = self._frame_count - self._fps_estimate * 60
            self._blink_history = [f for f in self._blink_history if f > cutoff]

    def _estimate_blink_rate(self) -> float:
        """Blinks per minute estimate from history."""
        if len(self._blink_history) < 2:
            return 15.0
        window_frames = self._frame_count - self._blink_history[0]
        window_minutes = window_frames / (self._fps_estimate * 60 + 1e-8)
        rate = len(self._blink_history) / (window_minutes + 1e-8)
        return round(float(np.clip(rate, 0, 60)), 2)

    def release(self) -> None:
        if self._face_mesh:
            self._face_mesh.close()
        if self._pose:
            self._pose.close()
