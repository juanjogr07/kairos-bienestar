"""
XGBoost mood change predictor — KAI-52 (US-ML-002).

Output contract (saved to ml_results.result):
{
    "predicted_phq9_change": float,
    "direction": "increase" | "decrease" | "stable",
    "confidence": float,   # 0-1, derived from prediction magnitude
    "risk_window_days": int  # always 7
}
direction = "stable" when |predicted_phq9_change| < 1.0
"""
import logging
from pathlib import Path

import joblib
import numpy as np

from services.ml.features import FEATURE_NAMES, build_feature_vector

try:
    from xgboost import XGBRegressor as _XGBRegressor
    _XGBOOST_AVAILABLE = True
except ImportError:
    _XGBRegressor = None
    _XGBOOST_AVAILABLE = False

logger = logging.getLogger(__name__)

_REPO_ROOT = Path(__file__).resolve().parents[3]
MODEL_PATH = _REPO_ROOT / "data" / "models" / "xgboost_mood.joblib"
SYNTHETIC_PATH = _REPO_ROOT / "data" / "synthetic" / "mood_training.csv"

STABLE_THRESHOLD = 1.0
RISK_WINDOW_DAYS = 7
MAX_EXPECTED_DELTA = 5.0  # synthetic data is clipped to [-5, 5]

_cached_artifacts: dict | None = None


def _load_or_train() -> dict:
    global _cached_artifacts
    if _cached_artifacts is not None:
        return _cached_artifacts

    if MODEL_PATH.exists():
        _cached_artifacts = joblib.load(MODEL_PATH)
        logger.info("XGBoost mood model loaded from %s", MODEL_PATH)
        return _cached_artifacts

    logger.warning(
        "Model not found at %s — training fallback. "
        "Run ml-worker/bootstrap.py for a proper model.",
        MODEL_PATH,
    )
    _cached_artifacts = _train_fallback()
    return _cached_artifacts


def _train_fallback() -> dict:
    if not _XGBOOST_AVAILABLE:
        return {"model": None, "feature_cols": FEATURE_NAMES}

    import pandas as pd

    if SYNTHETIC_PATH.exists():
        df = pd.read_csv(SYNTHETIC_PATH)
        feature_cols = [c for c in FEATURE_NAMES if c in df.columns]
        X = df[feature_cols].values
        y = df["phq9_delta_7d"].values
    else:
        rng = np.random.default_rng(42)
        n = 100
        X = rng.uniform(
            low=[30, 0, 0, 100, 1, 5, 0],
            high=[600, 1, 1, 1500, 30, 180, 1],
            size=(n, len(FEATURE_NAMES)),
        )
        y = rng.uniform(-3, 3, n)
        feature_cols = FEATURE_NAMES

    model = _XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        random_state=42,
        verbosity=0,
    )
    model.fit(X, y)
    return {"model": model, "feature_cols": feature_cols}


def _direction(delta: float) -> str:
    if abs(delta) < STABLE_THRESHOLD:
        return "stable"
    return "increase" if delta > 0 else "decrease"


def _confidence(delta: float) -> float:
    """Scale |delta| to [0, 1] relative to max expected change."""
    return round(min(abs(delta) / MAX_EXPECTED_DELTA, 1.0), 4)


def predict_mood_change(features: dict) -> dict:
    """
    Predict 7-day PHQ-9 change for a user's feature vector.

    Args:
        features: dict with keys matching FEATURE_NAMES

    Returns:
        {"predicted_phq9_change": float, "direction": str,
         "confidence": float, "risk_window_days": int}
    """
    artifacts = _load_or_train()
    feature_cols = artifacts["feature_cols"]

    if artifacts["model"] is None:
        return {
            "predicted_phq9_change": 0.0,
            "direction": "stable",
            "confidence": 0.0,
            "risk_window_days": RISK_WINDOW_DAYS,
        }

    X = np.array([[features[k] for k in feature_cols]], dtype=float)
    raw = float(artifacts["model"].predict(X)[0])
    delta = round(float(np.clip(raw, -MAX_EXPECTED_DELTA, MAX_EXPECTED_DELTA)), 4)

    return {
        "predicted_phq9_change": delta,
        "direction": _direction(delta),
        "confidence": _confidence(delta),
        "risk_window_days": RISK_WINDOW_DAYS,
    }


def invalidate_cache() -> None:
    global _cached_artifacts
    _cached_artifacts = None
