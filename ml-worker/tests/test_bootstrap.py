"""
Tests for KAI-50 bootstrap pipeline.
Uses synthetic in-memory DataFrames — no DB, no GPU required.
"""
import sys
import os
import numpy as np
import pandas as pd
import pytest

_repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(_repo_root, "api-service"))
sys.path.insert(0, os.path.join(_repo_root, "ml-worker"))

from services.ml.features import FEATURE_NAMES, build_feature_vector, extract_features_from_events
from bootstrap import train_isolation_forest, train_xgboost_mood


def _make_df(n: int = 60) -> pd.DataFrame:
    np.random.seed(0)
    df = pd.DataFrame({
        "total_minutes": np.random.uniform(30, 600, n),
        "nocturnal_ratio": np.random.uniform(0, 1, n),
        "social_ratio": np.random.uniform(0, 1, n),
        "avg_scroll_speed": np.random.uniform(100, 1500, n),
        "session_count": np.random.randint(1, 30, n).astype(float),
        "max_session_minutes": np.random.uniform(5, 180, n),
        "productive_ratio": np.random.uniform(0, 1, n),
        "phq9_delta_7d": np.random.uniform(-5, 5, n),
    })
    return df


class TestFeatures:
    def test_feature_names_length(self):
        assert len(FEATURE_NAMES) == 7

    def test_build_feature_vector_shape(self):
        feat = {k: 0.5 for k in FEATURE_NAMES}
        X = build_feature_vector(feat)
        assert X.shape == (1, 7)

    def test_extract_features_empty(self):
        feats = extract_features_from_events([])
        assert feats["total_minutes"] == 0.0
        assert feats["nocturnal_ratio"] == 0.0

    def test_extract_features_social_ratio(self):
        events = [
            {"domain": "instagram.com", "duration_seconds": 60, "timestamp": "2026-05-23T12:00:00"},
            {"domain": "docs.google.com", "duration_seconds": 60, "timestamp": "2026-05-23T12:01:00"},
        ]
        feats = extract_features_from_events(events)
        assert feats["social_ratio"] == pytest.approx(0.5)
        assert feats["productive_ratio"] == pytest.approx(0.5)

    def test_extract_features_nocturnal(self):
        events = [
            {"domain": "youtube.com", "duration_seconds": 600, "timestamp": "2026-05-23T23:00:00"},
            {"domain": "youtube.com", "duration_seconds": 600, "timestamp": "2026-05-23T14:00:00"},
        ]
        feats = extract_features_from_events(events)
        assert feats["nocturnal_ratio"] == pytest.approx(0.5)


class TestIsolationForest:
    def test_trains_without_error(self):
        df = _make_df()
        artifacts = train_isolation_forest(df)
        assert "model" in artifacts
        assert "scaler" in artifacts

    def test_decision_function_returns_floats(self):
        df = _make_df()
        artifacts = train_isolation_forest(df)
        X = df[FEATURE_NAMES].values
        X_scaled = artifacts["scaler"].transform(X)
        scores = artifacts["model"].decision_function(X_scaled)
        assert scores.shape == (len(df),)
        assert all(isinstance(s, (float, np.floating)) for s in scores)

    def test_contamination_rate(self):
        df = _make_df(100)
        artifacts = train_isolation_forest(df)
        X_scaled = artifacts["scaler"].transform(df[FEATURE_NAMES].values)
        preds = artifacts["model"].predict(X_scaled)
        anomaly_rate = (preds == -1).sum() / len(preds)
        # contamination=0.1, allow small variance
        assert 0.05 <= anomaly_rate <= 0.20


class TestXGBoostMood:
    def test_trains_without_error(self):
        df = _make_df()
        artifacts = train_xgboost_mood(df)
        assert "model" in artifacts
        assert "feature_cols" in artifacts

    def test_predict_shape(self):
        df = _make_df(60)
        artifacts = train_xgboost_mood(df)
        preds = artifacts["model"].predict(df[artifacts["feature_cols"]].values)
        assert preds.shape == (60,)

    def test_predict_range(self):
        df = _make_df(60)
        artifacts = train_xgboost_mood(df)
        preds = artifacts["model"].predict(df[artifacts["feature_cols"]].values)
        # Predictions should be in a reasonable range around [-5, 5]
        assert preds.min() > -20
        assert preds.max() < 20
