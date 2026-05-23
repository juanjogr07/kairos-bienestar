"""
Modelo 5 — XGBoost Triage Scorer  ⭐ Modelo más importante del MVP

Puntúa 5 señales de triaje a partir de features conductuales + PHQ-9/GAD-7.
Output: attention_fragmentation, nocturnal_pattern, doomscrolling,
        low_mood_indicator, anxiety_indicator — todos float [0,1].
"""
from __future__ import annotations

import os
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.multioutput import MultiOutputRegressor
from sklearn.preprocessing import StandardScaler

from ml_worker.config import MODELS_DIR

FEATURE_COLS = [
    "total_usage_min",
    "nocturnal_min",
    "nocturnal_ratio",
    "social_ratio",
    "productive_ratio",
    "avg_scroll_speed",
    "session_count",
    "max_session_min",
    "app_switches_per_hour",
    "notification_count",
    "phq9_score",
    "gad7_score",
    "anomaly_score",
    "streak_adherence_rate",
]

TARGET_COLS = [
    "attention_fragmentation",
    "nocturnal_pattern",
    "doomscrolling",
    "low_mood_indicator",
    "anxiety_indicator",
]


def _model_path(user_id: str | None = None) -> str:
    name = f"xgb_{user_id}.joblib" if user_id else "xgb_global.joblib"
    return os.path.join(MODELS_DIR, name)


def _scaler_path(user_id: str | None = None) -> str:
    name = f"scaler_xgb_{user_id}.joblib" if user_id else "scaler_xgb_global.joblib"
    return os.path.join(MODELS_DIR, name)


def _build_targets_from_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Derive soft labels from PHQ-9/GAD-7 and behavioral features.

    Used when we don't have human annotations (cold-start training).
    """
    t = pd.DataFrame(index=df.index)

    # attention_fragmentation: high session count + high app switches
    t["attention_fragmentation"] = (
        (df.get("session_count", 0) / 30).clip(0, 1) * 0.5
        + (df.get("app_switches_per_hour", 0) / 20).clip(0, 1) * 0.5
    )

    # nocturnal_pattern: nocturnal ratio + nocturnal minutes
    t["nocturnal_pattern"] = (
        df.get("nocturnal_ratio", 0).clip(0, 1) * 0.6
        + (df.get("nocturnal_min", 0) / 120).clip(0, 1) * 0.4
    )

    # doomscrolling: high scroll speed + high social ratio + high total usage
    t["doomscrolling"] = (
        (df.get("avg_scroll_speed", 0) / 1500).clip(0, 1) * 0.4
        + df.get("social_ratio", 0).clip(0, 1) * 0.35
        + (df.get("total_usage_min", 0) / 480).clip(0, 1) * 0.25
    )

    # low_mood_indicator: PHQ-9 scaled to [0,1] (max = 27)
    t["low_mood_indicator"] = (df.get("phq9_score", 0) / 27).clip(0, 1)

    # anxiety_indicator: GAD-7 scaled to [0,1] (max = 21)
    t["anxiety_indicator"] = (df.get("gad7_score", 0) / 21).clip(0, 1)

    return t


def train_xgboost(df: pd.DataFrame, user_id: str | None = None) -> MultiOutputRegressor:
    """Train XGBoost triage scorer.

    df must contain FEATURE_COLS. Targets are derived if not present.
    user_id=None trains the global model.
    """
    X = df[[c for c in FEATURE_COLS if c in df.columns]].fillna(0)
    # Pad missing features with zeros
    for col in FEATURE_COLS:
        if col not in X.columns:
            X[col] = 0.0
    X = X[FEATURE_COLS]

    if all(c in df.columns for c in TARGET_COLS):
        y = df[TARGET_COLS].fillna(0).clip(0, 1)
    else:
        y = _build_targets_from_labels(df)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X.values)

    base_xgb = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42,
        n_jobs=-1,
    )
    model = MultiOutputRegressor(base_xgb)
    model.fit(X_scaled, y.values)

    joblib.dump(model, _model_path(user_id))
    joblib.dump(scaler, _scaler_path(user_id))
    return model


def load_xgboost(user_id: str | None = None) -> tuple[MultiOutputRegressor, StandardScaler] | None:
    mp, sp = _model_path(user_id), _scaler_path(user_id)
    if not (os.path.exists(mp) and os.path.exists(sp)):
        return None
    return joblib.load(mp), joblib.load(sp)


def predict_triage_scores(row: dict, user_id: str | None = None) -> dict:
    """Score triage signals for a single feature snapshot.

    Falls back to global model, then to rule-based if no model available.
    """
    result = load_xgboost(user_id) or load_xgboost(None)
    if result is None:
        return _rule_based_triage(row)

    model, scaler = result
    x = np.array([[row.get(c, 0) for c in FEATURE_COLS]], dtype=float)
    x_scaled = scaler.transform(x)
    preds = model.predict(x_scaled)[0]

    scores = {col: round(float(np.clip(preds[i], 0, 1)), 4) for i, col in enumerate(TARGET_COLS)}
    scores["model"] = "xgboost_personal" if user_id and os.path.exists(_model_path(user_id)) else "xgboost_global"
    return scores


def _rule_based_triage(row: dict) -> dict:
    """Fallback when no model is trained yet — pure rule-based scoring."""
    return {
        "attention_fragmentation": round(min((row.get("session_count", 0) / 30) * 0.5 + (row.get("app_switches_per_hour", 0) / 20) * 0.5, 1.0), 4),
        "nocturnal_pattern": round(min(row.get("nocturnal_ratio", 0) * 0.6 + (row.get("nocturnal_min", 0) / 120) * 0.4, 1.0), 4),
        "doomscrolling": round(min((row.get("avg_scroll_speed", 0) / 1500) * 0.4 + row.get("social_ratio", 0) * 0.35 + (row.get("total_usage_min", 0) / 480) * 0.25, 1.0), 4),
        "low_mood_indicator": round(min(row.get("phq9_score", 0) / 27, 1.0), 4),
        "anxiety_indicator": round(min(row.get("gad7_score", 0) / 21, 1.0), 4),
        "model": "rule_based",
    }
