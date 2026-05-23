"""
Tests for US-ML-001 — Isolation Forest pipeline.
All tests use synthetic in-memory data. No DB required.
"""
import sys
import os
from unittest.mock import MagicMock, patch, call
from datetime import date, timedelta

import numpy as np
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ml.features import FEATURE_NAMES
from services.ml.isolation_forest import score_user, invalidate_cache


def _normal_features() -> dict:
    return {
        "total_minutes": 90.0,
        "nocturnal_ratio": 0.1,
        "social_ratio": 0.2,
        "avg_scroll_speed": 300.0,
        "session_count": 8.0,
        "max_session_minutes": 25.0,
        "productive_ratio": 0.6,
    }


def _anomalous_features() -> dict:
    return {
        "total_minutes": 590.0,
        "nocturnal_ratio": 0.9,
        "social_ratio": 0.85,
        "avg_scroll_speed": 1400.0,
        "session_count": 29.0,
        "max_session_minutes": 175.0,
        "productive_ratio": 0.02,
    }


@pytest.fixture(autouse=True)
def clear_model_cache():
    """Reset in-memory model cache between tests for isolation."""
    invalidate_cache()
    yield
    invalidate_cache()


class TestScoreUserContract:
    def test_returns_required_keys(self):
        result = score_user(_normal_features())
        assert set(result.keys()) == {
            "anomaly_score", "is_anomaly", "risk_level", "flagged_features"
        }

    def test_anomaly_score_is_float(self):
        result = score_user(_normal_features())
        assert isinstance(result["anomaly_score"], float)

    def test_is_anomaly_is_bool(self):
        result = score_user(_normal_features())
        assert isinstance(result["is_anomaly"], bool)

    def test_risk_level_valid_values(self):
        for feat in [_normal_features(), _anomalous_features()]:
            result = score_user(feat)
            assert result["risk_level"] in {"low", "medium", "high"}

    def test_flagged_features_is_list(self):
        result = score_user(_normal_features())
        assert isinstance(result["flagged_features"], list)


class TestScoreUserLogic:
    def test_normal_user_has_low_risk(self):
        result = score_user(_normal_features())
        assert result["risk_level"] == "low"
        assert result["is_anomaly"] is False

    def test_anomalous_user_scores_lower_than_normal(self):
        # Isolation Forest: lower score = more anomalous.
        # We assert relative ordering, not a fixed threshold,
        # since the threshold depends on training data distribution.
        normal = score_user(_normal_features())
        anomalous = score_user(_anomalous_features())
        assert anomalous["anomaly_score"] < normal["anomaly_score"]

    def test_high_nocturnal_ratio_is_flagged(self):
        feat = _normal_features()
        feat["nocturnal_ratio"] = 0.8
        result = score_user(feat)
        assert "nocturnal_ratio" in result["flagged_features"]

    def test_low_nocturnal_ratio_not_flagged(self):
        feat = _normal_features()
        feat["nocturnal_ratio"] = 0.1
        result = score_user(feat)
        assert "nocturnal_ratio" not in result["flagged_features"]

    def test_high_scroll_speed_is_flagged(self):
        feat = _normal_features()
        feat["avg_scroll_speed"] = 1200.0
        result = score_user(feat)
        assert "avg_scroll_speed" in result["flagged_features"]

    def test_high_social_ratio_is_flagged(self):
        feat = _normal_features()
        feat["social_ratio"] = 0.75
        result = score_user(feat)
        assert "social_ratio" in result["flagged_features"]

    def test_risk_level_consistency_with_anomaly(self):
        result = score_user(_normal_features())
        if result["is_anomaly"]:
            assert result["risk_level"] in {"medium", "high"}
        else:
            assert result["risk_level"] == "low"


class TestRunner:
    def _make_supabase(self, events: list[dict], existing_result: list = None):
        mock = MagicMock()

        # usage_events fetch
        mock.table.return_value.select.return_value.eq.return_value.gte.return_value.execute.return_value = MagicMock(
            data=events
        )

        # ml_results existing check
        existing_check = MagicMock(data=existing_result or [])
        (
            mock.table.return_value.select.return_value.eq.return_value.eq.return_value
            .gte.return_value.lt.return_value.execute.return_value
        ) = existing_check

        mock.table.return_value.insert.return_value.execute.return_value = MagicMock()
        mock.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock()
        return mock

    def test_skips_user_with_insufficient_events(self):
        from services.ml.runner import run_isolation_forest_for_user

        supabase = self._make_supabase(events=[
            {"domain": "google.com", "duration_seconds": 60, "timestamp": "2026-05-23T10:00:00", "scroll_speed": None},
        ])
        result = run_isolation_forest_for_user("user-1", supabase)
        assert result is None

    def test_returns_result_for_user_with_enough_events(self):
        from services.ml.runner import run_isolation_forest_for_user

        events = [
            {"domain": "google.com", "duration_seconds": 300, "timestamp": f"2026-05-{20+i}T10:00:00", "scroll_speed": 200.0}
            for i in range(5)
        ]
        supabase = self._make_supabase(events=events)
        result = run_isolation_forest_for_user("user-1", supabase)

        assert result is not None
        assert "anomaly_score" in result
        assert "risk_level" in result
