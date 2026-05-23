"""
Tests for US-ML-002 — XGBoost mood change predictor.
No DB required. 5 cases verifying direction logic per spec.
"""
import sys
import os

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.ml.xgboost_mood import predict_mood_change, invalidate_cache


def _features(**overrides) -> dict:
    base = {
        "total_minutes": 90.0,
        "nocturnal_ratio": 0.1,
        "social_ratio": 0.2,
        "avg_scroll_speed": 300.0,
        "session_count": 8.0,
        "max_session_minutes": 25.0,
        "productive_ratio": 0.6,
    }
    base.update(overrides)
    return base


@pytest.fixture(autouse=True)
def clear_cache():
    invalidate_cache()
    yield
    invalidate_cache()


class TestContract:
    def test_returns_required_keys(self):
        result = predict_mood_change(_features())
        assert set(result.keys()) == {
            "predicted_phq9_change", "direction", "confidence", "risk_window_days"
        }

    def test_predicted_phq9_change_is_float(self):
        result = predict_mood_change(_features())
        assert isinstance(result["predicted_phq9_change"], float)

    def test_direction_valid_values(self):
        result = predict_mood_change(_features())
        assert result["direction"] in {"increase", "decrease", "stable"}

    def test_confidence_between_0_and_1(self):
        result = predict_mood_change(_features())
        assert 0.0 <= result["confidence"] <= 1.0

    def test_risk_window_always_7(self):
        result = predict_mood_change(_features())
        assert result["risk_window_days"] == 7


class TestDirectionLogic:
    def test_stable_when_small_positive_delta(self):
        """direction = stable when |predicted_phq9_change| < 1.0"""
        # productive + low usage → model predicts small/negative delta
        result = predict_mood_change(_features(
            productive_ratio=0.9,
            total_minutes=35.0,
            nocturnal_ratio=0.0,
            social_ratio=0.0,
        ))
        # Can't force exact value, but direction must match the delta
        delta = result["predicted_phq9_change"]
        if abs(delta) < 1.0:
            assert result["direction"] == "stable"
        elif delta > 0:
            assert result["direction"] == "increase"
        else:
            assert result["direction"] == "decrease"

    def test_direction_increase_when_delta_above_threshold(self):
        """If model predicts delta >= 1, direction must be 'increase'."""
        # Manually mock a large positive delta via monkeypatching
        import services.ml.xgboost_mood as mod
        from unittest.mock import patch
        import numpy as np

        with patch.object(mod, "_load_or_train") as mock_load:
            mock_model = type("M", (), {"predict": lambda self, X: np.array([2.5])})()
            mock_load.return_value = {"model": mock_model, "feature_cols": list(mod.FEATURE_NAMES)}
            result = predict_mood_change(_features())

        assert result["direction"] == "increase"
        assert result["predicted_phq9_change"] == pytest.approx(2.5)
        assert result["confidence"] == pytest.approx(2.5 / 5.0, abs=1e-3)

    def test_direction_decrease_when_delta_below_negative_threshold(self):
        import services.ml.xgboost_mood as mod
        from unittest.mock import patch
        import numpy as np

        with patch.object(mod, "_load_or_train") as mock_load:
            mock_model = type("M", (), {"predict": lambda self, X: np.array([-3.0])})()
            mock_load.return_value = {"model": mock_model, "feature_cols": list(mod.FEATURE_NAMES)}
            result = predict_mood_change(_features())

        assert result["direction"] == "decrease"
        assert result["predicted_phq9_change"] == pytest.approx(-3.0)

    def test_direction_stable_when_delta_within_threshold(self):
        import services.ml.xgboost_mood as mod
        from unittest.mock import patch
        import numpy as np

        with patch.object(mod, "_load_or_train") as mock_load:
            mock_model = type("M", (), {"predict": lambda self, X: np.array([0.4])})()
            mock_load.return_value = {"model": mock_model, "feature_cols": list(mod.FEATURE_NAMES)}
            result = predict_mood_change(_features())

        assert result["direction"] == "stable"
        assert result["confidence"] == pytest.approx(0.4 / 5.0, abs=1e-3)

    def test_delta_clipped_to_max_range(self):
        """Predictions beyond [-5, 5] are clipped."""
        import services.ml.xgboost_mood as mod
        from unittest.mock import patch
        import numpy as np

        with patch.object(mod, "_load_or_train") as mock_load:
            mock_model = type("M", (), {"predict": lambda self, X: np.array([99.0])})()
            mock_load.return_value = {"model": mock_model, "feature_cols": list(mod.FEATURE_NAMES)}
            result = predict_mood_change(_features())

        assert result["predicted_phq9_change"] == pytest.approx(5.0)
        assert result["confidence"] == pytest.approx(1.0)
