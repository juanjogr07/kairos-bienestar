"""
Isolation Forest inference module — KAI-51 (US-ML-001).

Output contract (saved to ml_results.result):
{
    "anomaly_score": float,       # decision_function score (higher = more normal)
    "is_anomaly": bool,           # True if score < ANOMALY_THRESHOLD
    "risk_level": "low" | "medium" | "high",
    "flagged_features": list[str]
}
"""
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from services.ml.features import FEATURE_NAMES, build_feature_vector

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]  # api-service/services/ml/ → root
MODEL_PATH = _REPO_ROOT / "data" / "models" / "isolation_forest.joblib"
CONTAMINATION = 0.1
ANOMALY_THRESHOLD = -0.1
HIGH_RISK_THRESHOLD = -0.3

# Thresholds for flagging individual features
_FLAG_RULES = {
    "nocturnal_ratio": lambda v: v > 0.4,
    "social_ratio": lambda v: v > 0.6,
    "avg_scroll_speed": lambda v: v > 800,
    "total_minutes": lambda v: v > 480,
}

_cached_artifacts: dict | None = None


def _load_or_train() -> dict:
    """Load pre-trained model from disk, or train a fallback on synthetic data."""
    global _cached_artifacts

    if _cached_artifacts is not None:
        return _cached_artifacts

    if MODEL_PATH.exists():
        _cached_artifacts = joblib.load(MODEL_PATH)
        logger.info("Isolation Forest loaded from %s", MODEL_PATH)
        return _cached_artifacts

    logger.warning(
        "Model not found at %s — training fallback on synthetic data. "
        "Run ml-worker/bootstrap.py to generate a proper model.",
        MODEL_PATH,
    )
    _cached_artifacts = _train_fallback()
    return _cached_artifacts


def _train_fallback() -> dict:
    """Train a minimal model on synthetic data when no pre-trained model exists."""
    import pandas as pd

    synthetic_path = _REPO_ROOT / "data" / "synthetic" / "mood_training.csv"
    if synthetic_path.exists():
        df = pd.read_csv(synthetic_path)
        X = df[FEATURE_NAMES].values
    else:
        rng = np.random.default_rng(42)
        X = rng.uniform(
            low=[30, 0, 0, 100, 1, 5, 0],
            high=[600, 1, 1, 1500, 30, 180, 1],
            size=(100, len(FEATURE_NAMES)),
        )

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=100,
        contamination=CONTAMINATION,
        random_state=42,
    )
    model.fit(X_scaled)
    return {"model": model, "scaler": scaler, "feature_names": FEATURE_NAMES}


def score_user(features: dict) -> dict:
    """
    Score a user's feature vector and return the ml_results contract.

    Args:
        features: dict with keys matching FEATURE_NAMES

    Returns:
        {"anomaly_score": float, "is_anomaly": bool,
         "risk_level": str, "flagged_features": list[str]}
    """
    artifacts = _load_or_train()
    X = build_feature_vector(features)
    X_scaled = artifacts["scaler"].transform(X)

    raw_score = float(artifacts["model"].decision_function(X_scaled)[0])

    is_anomaly = raw_score < ANOMALY_THRESHOLD
    if raw_score < HIGH_RISK_THRESHOLD:
        risk_level = "high"
    elif raw_score < ANOMALY_THRESHOLD:
        risk_level = "medium"
    else:
        risk_level = "low"

    flagged = [
        name
        for name, rule in _FLAG_RULES.items()
        if name in features and rule(features[name])
    ]

    return {
        "anomaly_score": raw_score,
        "is_anomaly": is_anomaly,
        "risk_level": risk_level,
        "flagged_features": flagged,
    }


def invalidate_cache() -> None:
    """Force reload of model on next call. Useful after retraining."""
    global _cached_artifacts
    _cached_artifacts = None
