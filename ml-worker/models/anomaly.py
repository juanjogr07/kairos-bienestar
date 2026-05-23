"""
Modelo 2 — Isolation Forest
Detecta días atípicos de uso como posibles correlatos de eventos vitales o recaídas.

Modelo 3 — LSTM Autoencoder (stub para Fase 2)
Detecta patrones temporales complejos en matrices de 14d × 24h.
"""
from __future__ import annotations

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from ml_worker.config import MODELS_DIR, IF_CONTAMINATION

FEATURE_COLS = [
    "total_usage_min",
    "nocturnal_min",
    "session_count",
    "app_switches",
    "scroll_distance_km",
    "notification_count",
]


# ─── Isolation Forest ─────────────────────────────────────────────────────────

def _model_path(user_id: str | None = None) -> str:
    name = f"if_{user_id}.joblib" if user_id else "if_global.joblib"
    return os.path.join(MODELS_DIR, name)


def _scaler_path(user_id: str | None = None) -> str:
    name = f"scaler_if_{user_id}.joblib" if user_id else "scaler_if_global.joblib"
    return os.path.join(MODELS_DIR, name)


def train_isolation_forest(df: pd.DataFrame, user_id: str | None = None) -> IsolationForest:
    """Train Isolation Forest on daily feature rows.

    df must contain FEATURE_COLS. user_id=None trains the global model.
    """
    X = df[FEATURE_COLS].fillna(0).values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=200,
        contamination=IF_CONTAMINATION,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    joblib.dump(model, _model_path(user_id))
    joblib.dump(scaler, _scaler_path(user_id))
    return model


def load_isolation_forest(user_id: str | None = None) -> tuple[IsolationForest, StandardScaler] | None:
    mp, sp = _model_path(user_id), _scaler_path(user_id)
    if not (os.path.exists(mp) and os.path.exists(sp)):
        return None
    return joblib.load(mp), joblib.load(sp)


def predict_anomaly(row: dict, user_id: str | None = None) -> dict:
    """Score a single daily feature snapshot.

    Falls back to global model if personal model doesn't exist.
    Returns: {anomaly_score, is_anomaly, risk_level, flagged_features}
    """
    result = load_isolation_forest(user_id) or load_isolation_forest(None)
    if result is None:
        return _cold_start_anomaly(row)

    model, scaler = result
    x = np.array([[row.get(c, 0) for c in FEATURE_COLS]], dtype=float)
    x_scaled = scaler.transform(x)

    # decision_function: negative → more anomalous; score_samples: log density
    raw_score = float(model.decision_function(x_scaled)[0])
    # normalize to [0, 1] — lower raw_score means more anomalous
    anomaly_score = float(np.clip(1 - (raw_score + 0.5), 0, 1))
    is_anomaly = bool(model.predict(x_scaled)[0] == -1)

    risk_level = "low"
    if anomaly_score > 0.75:
        risk_level = "high"
    elif anomaly_score > 0.5:
        risk_level = "medium"

    # Flag features that deviate strongly from training mean
    flagged = []
    mean = scaler.mean_
    std = scaler.scale_
    for i, col in enumerate(FEATURE_COLS):
        z = abs((row.get(col, 0) - mean[i]) / (std[i] + 1e-8))
        if z > 2.5:
            flagged.append(col)

    return {
        "anomaly_score": round(anomaly_score, 4),
        "is_anomaly": is_anomaly,
        "risk_level": risk_level,
        "flagged_features": flagged,
    }


def _cold_start_anomaly(row: dict) -> dict:
    """Rule-based fallback when no model is trained yet."""
    score = 0.0
    flagged = []
    if row.get("total_usage_min", 0) > 480:
        score += 0.3; flagged.append("total_usage_min")
    if row.get("nocturnal_min", 0) > 90:
        score += 0.25; flagged.append("nocturnal_min")
    if row.get("session_count", 0) > 50:
        score += 0.2; flagged.append("session_count")
    score = min(score, 1.0)
    return {
        "anomaly_score": round(score, 4),
        "is_anomaly": score > 0.5,
        "risk_level": "high" if score > 0.75 else ("medium" if score > 0.4 else "low"),
        "flagged_features": flagged,
    }


# ─── LSTM Autoencoder (Fase 2 stub) ───────────────────────────────────────────

class LSTMAutoencoder:
    """Placeholder for Phase 2 LSTM Autoencoder.

    Input: matrix (14, 24) — 14 days × 24 hours of usage.
    Output: reconstruction_error, temporal_anomaly_flag.
    """

    def fit(self, sequences: np.ndarray) -> None:
        raise NotImplementedError("LSTM Autoencoder activates in Phase 2 (≥60 days data)")

    def score(self, sequence: np.ndarray) -> dict:
        raise NotImplementedError("LSTM Autoencoder activates in Phase 2")
