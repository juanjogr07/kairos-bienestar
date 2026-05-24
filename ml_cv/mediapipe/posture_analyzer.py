"""
MediaPipe — Posture & Fatigue Analyzer  (Fase 3, on-device)

Detecta: postura al sentarse, eye strain, fatiga facial, tensión corporal.
Retorna pose_landmarks (33 puntos normalizados) para dibujar exoesqueleto.
"""
from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass, field

import numpy as np

logger = logging.getLogger(__name__)

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    logger.warning("MediaPipe not installed — PostureAnalyzer will return neutral scores")


@dataclass
class PoseLandmark:
    x: float
    y: float
    z: float
    visibility: float


@dataclass
class PostureResult:
    posture_score: float = 0.5
    eye_strain_score: float = 0.0
    blink_rate_rpm: float = 15.0
    head_tilt_deg: float = 0.0
    landmarks_detected: bool = False
    # New: skeleton data
    pose_landmarks: list[PoseLandmark] = field(default_factory=list)
    # New: anxiety-relevant metrics
    shoulder_tension: float = 0.0    # 0-1, 1 = hombros muy elevados/tensos
    body_movement_rate: float = 0.0  # velocidad promedio de landmarks clave (px/frame norm.)
    wrist_face_distance: float = 1.0 # distancia muñeca-nariz normalizada (< 0.15 = face touch)
    raw: dict = field(default_factory=dict)


class PostureAnalyzer:
    """Stateful analyzer. Procesa frames y mantiene historial de parpadeos y movimiento."""

    LEFT_EYE_INDICES  = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
    RIGHT_EYE_INDICES = [33,  7,   163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]

    # MediaPipe Pose landmark indices
    NOSE        = 0
    L_SHOULDER  = 11
    R_SHOULDER  = 12
    L_ELBOW     = 13
    R_ELBOW     = 14
    L_WRIST     = 15
    R_WRIST     = 16
    L_HIP       = 23
    R_HIP       = 24

    # Key landmarks used for movement tracking
    MOVEMENT_INDICES = [0, 11, 12, 15, 16, 23, 24]

    def __init__(self) -> None:
        self._face_mesh = None
        self._pose = None
        self._blink_history: list[float] = []
        self._frame_count = 0
        self._fps_estimate = 10.0

        # Rolling buffer for body movement rate (last 10 frames)
        self._prev_key_positions: np.ndarray | None = None
        self._movement_buffer: deque[float] = deque(maxlen=10)

        # Shoulder neutral baseline (set from first N frames)
        self._shoulder_baseline_y: float | None = None
        self._baseline_frames = 0

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
        """Procesa un frame RGB (H×W×3 uint8). Retorna PostureResult con todos los scores."""
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
                result.head_tilt_deg    = self._compute_head_tilt(lm)
                self._track_blink(result.eye_strain_score)
                result.blink_rate_rpm = self._estimate_blink_rate()
                nose_xy = np.array([lm[1].x, lm[1].y])
            else:
                nose_xy = None

            pose_results = self._pose.process(frame_rgb)
            if pose_results.pose_landmarks:
                plm = pose_results.pose_landmarks.landmark
                result.pose_landmarks    = self._serialize_landmarks(plm)
                result.posture_score     = self._compute_posture_score(plm)
                result.shoulder_tension  = self._compute_shoulder_tension(plm)
                result.body_movement_rate = self._compute_movement_rate(plm)
                if nose_xy is not None:
                    result.wrist_face_distance = self._compute_wrist_face_dist(plm, nose_xy)

        except Exception as e:
            logger.debug("Frame analysis error: %s", e)

        return result

    # ── Helpers ──────────────────────────────────────────────────────────────

    def _serialize_landmarks(self, plm) -> list[PoseLandmark]:
        return [
            PoseLandmark(
                x=round(float(lm.x), 4),
                y=round(float(lm.y), 4),
                z=round(float(lm.z), 4),
                visibility=round(float(lm.visibility), 3),
            )
            for lm in plm
        ]

    def _compute_ear(self, landmarks) -> float:
        def _ear_single(indices):
            pts = np.array([[landmarks[i].x, landmarks[i].y] for i in indices])
            v1 = np.linalg.norm(pts[1] - pts[5])
            v2 = np.linalg.norm(pts[2] - pts[4])
            h  = np.linalg.norm(pts[0] - pts[3])
            return (v1 + v2) / (2.0 * h + 1e-8)

        avg_ear = (_ear_single(self.LEFT_EYE_INDICES[:6]) + _ear_single(self.RIGHT_EYE_INDICES[:6])) / 2.0
        strain  = float(np.clip(1.0 - (avg_ear / 0.3), 0, 1))
        return round(strain, 4)

    def _compute_head_tilt(self, landmarks) -> float:
        nose = np.array([landmarks[1].x, landmarks[1].y])
        chin = np.array([landmarks[152].x, landmarks[152].y])
        vec  = chin - nose
        return round(float(np.degrees(np.arctan2(vec[0], vec[1]))), 2)

    def _compute_posture_score(self, plm) -> float:
        ls, rs = plm[self.L_SHOULDER], plm[self.R_SHOULDER]
        height_diff = abs(ls.y - rs.y)
        score = float(np.clip(1.0 - height_diff * 10, 0, 1))
        return round(score, 4)

    def _compute_shoulder_tension(self, plm) -> float:
        """Tensión: qué tanto suben los hombros respecto al baseline inicial."""
        ls_y = (plm[self.L_SHOULDER].y + plm[self.R_SHOULDER].y) / 2.0
        if self._shoulder_baseline_y is None:
            if self._baseline_frames < 10:
                self._baseline_frames += 1
                return 0.0
            self._shoulder_baseline_y = ls_y

        # En imagen, Y crece hacia abajo. Hombros elevados → menor Y.
        elevation = max(0, self._shoulder_baseline_y - ls_y)
        tension = float(np.clip(elevation / 0.08, 0, 1))
        return round(tension, 4)

    def _compute_movement_rate(self, plm) -> float:
        """Velocidad promedio de landmarks clave entre frames consecutivos."""
        curr = np.array([[plm[i].x, plm[i].y] for i in self.MOVEMENT_INDICES])
        if self._prev_key_positions is None:
            self._prev_key_positions = curr
            return 0.0
        dists = np.linalg.norm(curr - self._prev_key_positions, axis=1)
        rate  = float(np.mean(dists))
        self._movement_buffer.append(rate)
        self._prev_key_positions = curr
        avg = float(np.mean(self._movement_buffer)) if self._movement_buffer else 0.0
        return round(avg, 5)

    def _compute_wrist_face_dist(self, plm, nose_xy: np.ndarray) -> float:
        """Distancia mínima entre cualquier muñeca y la nariz (normalizada 0-1)."""
        lw = np.array([plm[self.L_WRIST].x, plm[self.L_WRIST].y])
        rw = np.array([plm[self.R_WRIST].x, plm[self.R_WRIST].y])
        dist = float(min(np.linalg.norm(lw - nose_xy), np.linalg.norm(rw - nose_xy)))
        return round(float(np.clip(dist, 0, 1)), 4)

    def _track_blink(self, eye_strain: float) -> None:
        if eye_strain > 0.8:
            self._blink_history.append(self._frame_count)
            cutoff = self._frame_count - self._fps_estimate * 60
            self._blink_history = [f for f in self._blink_history if f > cutoff]

    def _estimate_blink_rate(self) -> float:
        if len(self._blink_history) < 2:
            return 15.0
        window_frames  = self._frame_count - self._blink_history[0]
        window_minutes = window_frames / (self._fps_estimate * 60 + 1e-8)
        rate = len(self._blink_history) / (window_minutes + 1e-8)
        return round(float(np.clip(rate, 0, 60)), 2)

    def release(self) -> None:
        if self._face_mesh:
            self._face_mesh.close()
        if self._pose:
            self._pose.close()
