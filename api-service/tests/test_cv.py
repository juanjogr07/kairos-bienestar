"""Tests for POST /api/v1/cv/analyze and GET /api/v1/cv/status."""
import base64
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

from main import app
from auth import get_current_user

app.dependency_overrides[get_current_user] = lambda: "test-user-cv"
client = TestClient(app)

FAKE_USER = "test-user-cv"

NEUTRAL_RESULT = {
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
    },
}


def _tiny_jpeg_b64() -> str:
    """1×1 white pixel JPEG as base64."""
    import io
    from PIL import Image
    img = Image.new("RGB", (1, 1), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return base64.b64encode(buf.getvalue()).decode()


class TestCVStatus:
    def test_status_returns_cv_available_key(self):
        resp = client.get("/api/v1/cv/status")
        assert resp.status_code == 200
        assert "cv_available" in resp.json()

    def test_status_value_is_bool(self):
        resp = client.get("/api/v1/cv/status")
        assert isinstance(resp.json()["cv_available"], bool)


class TestCVAnalyzeNoFrames:
    def test_analyze_no_frames_returns_200(self):
        with patch("routers.cv.analyze_frame", return_value=NEUTRAL_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={})
        assert resp.status_code == 200

    def test_analyze_no_frames_cv_available_false(self):
        with patch("routers.cv.analyze_frame", return_value=NEUTRAL_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={})
        assert resp.json()["cv_available"] is False

    def test_analyze_returns_required_keys(self):
        with patch("routers.cv.analyze_frame", return_value=NEUTRAL_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={})
        data = resp.json()
        for key in ["physical_wellness_score", "digital_context_score", "distraction_risk_score", "posture", "environment"]:
            assert key in data

    def test_posture_has_all_fields(self):
        with patch("routers.cv.analyze_frame", return_value=NEUTRAL_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={})
        posture = resp.json()["posture"]
        for field in ["posture_score", "eye_strain_score", "blink_rate_rpm", "head_tilt_deg", "landmarks_detected"]:
            assert field in posture

    def test_environment_has_all_fields(self):
        with patch("routers.cv.analyze_frame", return_value=NEUTRAL_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={})
        env = resp.json()["environment"]
        for field in ["context", "confidence", "detected_objects"]:
            assert field in env

    def test_scores_are_floats_between_0_and_1(self):
        with patch("routers.cv.analyze_frame", return_value=NEUTRAL_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={})
        data = resp.json()
        for key in ["physical_wellness_score", "digital_context_score", "distraction_risk_score"]:
            assert 0.0 <= data[key] <= 1.0


class TestCVAnalyzeWithMockedPipeline:
    CV_RESULT = {
        "cv_available": True,
        "physical_wellness_score": 0.82,
        "digital_context_score": 0.75,
        "distraction_risk_score": 0.15,
        "posture": {
            "posture_score": 0.88,
            "eye_strain_score": 0.12,
            "blink_rate_rpm": 18.0,
            "head_tilt_deg": 2.5,
            "landmarks_detected": True,
        },
        "environment": {
            "context": "workspace",
            "confidence": 0.9,
            "detected_objects": ["laptop", "keyboard"],
        },
    }

    def test_analyze_with_cv_available_true(self):
        with patch("routers.cv.analyze_frame", return_value=self.CV_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={"webcam_frame_b64": "abc"})
        assert resp.json()["cv_available"] is True

    def test_physical_wellness_score_correct(self):
        with patch("routers.cv.analyze_frame", return_value=self.CV_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={"webcam_frame_b64": "abc"})
        assert resp.json()["physical_wellness_score"] == pytest.approx(0.82)

    def test_environment_context_workspace(self):
        with patch("routers.cv.analyze_frame", return_value=self.CV_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={"webcam_frame_b64": "abc"})
        assert resp.json()["environment"]["context"] == "workspace"

    def test_landmarks_detected_true(self):
        with patch("routers.cv.analyze_frame", return_value=self.CV_RESULT):
            resp = client.post("/api/v1/cv/analyze", json={"webcam_frame_b64": "abc"})
        assert resp.json()["posture"]["landmarks_detected"] is True


