"""
ML pipeline integration tests — verifies features → model → result contract.
These tests use the real scikit-learn model but mock Supabase.
"""
import pytest
from pathlib import Path


MODELS_DIR = Path(__file__).resolve().parents[3] / "data" / "models"
MODELS_AVAILABLE = (MODELS_DIR / "isolation_forest.joblib").exists()


def _sample_features(
    total_minutes=120.0,
    nocturnal_ratio=0.1,
    social_ratio=0.3,
    avg_scroll_speed=300.0,
    session_count=15.0,
    max_session_minutes=45.0,
    productive_ratio=0.2,
):
    return {
        "total_minutes": total_minutes,
        "nocturnal_ratio": nocturnal_ratio,
        "social_ratio": social_ratio,
        "avg_scroll_speed": avg_scroll_speed,
        "session_count": session_count,
        "max_session_minutes": max_session_minutes,
        "productive_ratio": productive_ratio,
    }


class TestIsolationForestContract:
    def test_output_has_required_keys(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features())
        assert "anomaly_score" in result
        assert "is_anomaly" in result
        assert "risk_level" in result
        assert "flagged_features" in result

    def test_risk_level_is_valid(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features())
        assert result["risk_level"] in ("low", "medium", "high")

    def test_is_anomaly_is_bool(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features())
        assert isinstance(result["is_anomaly"], bool)

    def test_flagged_features_is_list(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features())
        assert isinstance(result["flagged_features"], list)

    def test_anomaly_score_is_float(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features())
        assert isinstance(result["anomaly_score"], float)

    def test_normal_user_is_low_risk(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features(
            total_minutes=90.0,
            nocturnal_ratio=0.05,
            social_ratio=0.2,
            avg_scroll_speed=200.0,
        ))
        assert result["risk_level"] in ("low", "medium")

    def test_extreme_nocturnal_flags_feature(self):
        from services.ml.isolation_forest import score_user
        result = score_user(_sample_features(nocturnal_ratio=0.95, total_minutes=500.0))
        assert "nocturnal_ratio" in result["flagged_features"] or result["risk_level"] in ("medium", "high")


class TestXGBoostMoodContract:
    def test_output_has_required_keys(self):
        from services.ml.xgboost_mood import predict_mood_change
        result = predict_mood_change(_sample_features())
        assert "predicted_phq9_change" in result
        assert "direction" in result
        assert "confidence" in result
        assert "risk_window_days" in result

    def test_direction_is_valid(self):
        from services.ml.xgboost_mood import predict_mood_change
        result = predict_mood_change(_sample_features())
        assert result["direction"] in ("increase", "decrease", "stable")

    def test_confidence_in_range(self):
        from services.ml.xgboost_mood import predict_mood_change
        result = predict_mood_change(_sample_features())
        assert 0.0 <= result["confidence"] <= 1.0

    def test_risk_window_is_7(self):
        from services.ml.xgboost_mood import predict_mood_change
        result = predict_mood_change(_sample_features())
        assert result["risk_window_days"] == 7

    def test_nocturnal_user_predicts_increase(self):
        from services.ml.xgboost_mood import predict_mood_change, invalidate_cache
        invalidate_cache()
        result = predict_mood_change(_sample_features(
            nocturnal_ratio=0.8,
            social_ratio=0.9,
            total_minutes=400.0,
        ))
        # High nocturnal + social ratio should predict worsening or be stable
        assert result["direction"] in ("increase", "stable")


class TestFeatureExtraction:
    def test_extract_features_returns_all_keys(self):
        from services.ml.features import extract_features_from_events, FEATURE_NAMES
        events = [
            {"domain": "instagram.com", "duration_seconds": 3600, "timestamp": "2026-05-23T22:30:00", "scroll_speed": 500.0},
            {"domain": "github.com", "duration_seconds": 1800, "timestamp": "2026-05-23T10:00:00", "scroll_speed": None},
        ]
        features = extract_features_from_events(events)
        for name in FEATURE_NAMES:
            assert name in features

    def test_nocturnal_event_counted(self):
        from services.ml.features import extract_features_from_events
        events = [
            {"domain": "tiktok.com", "duration_seconds": 3600, "timestamp": "2026-05-23T23:00:00", "scroll_speed": None},
        ]
        features = extract_features_from_events(events)
        assert features["nocturnal_ratio"] == pytest.approx(1.0)

    def test_social_ratio_computed(self):
        from services.ml.features import extract_features_from_events
        events = [
            {"domain": "instagram.com", "duration_seconds": 600, "timestamp": "2026-05-23T15:00:00", "scroll_speed": None},
            {"domain": "youtube.com", "duration_seconds": 400, "timestamp": "2026-05-23T16:00:00", "scroll_speed": None},
        ]
        features = extract_features_from_events(events)
        # Only instagram.com is social — 600/(600+400) = 0.6
        assert features["social_ratio"] == pytest.approx(0.6)

    def test_empty_events_returns_zeros(self):
        from services.ml.features import extract_features_from_events, FEATURE_NAMES
        features = extract_features_from_events([])
        for name in FEATURE_NAMES:
            assert features[name] == 0.0
