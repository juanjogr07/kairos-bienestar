"""
Modelo 1 — K-Means Usage Profiler  (Fase 2)

Segmenta usuarios en perfiles de uso digital:
  0 → "minimal"  1 → "moderate"  2 → "intensive"  3 → "nocturnal"
Output: cluster_label (int), cluster_name (str), profile_features (dict)
"""
from __future__ import annotations

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

from ml_worker.config import MODELS_DIR

FEATURE_COLS = [
    "total_usage_min",
    "nocturnal_ratio",
    "social_ratio",
    "productive_ratio",
    "session_count",
    "avg_scroll_speed",
]

N_CLUSTERS = 4

CLUSTER_NAMES = {
    0: "minimal",
    1: "moderate",
    2: "intensive",
    3: "nocturnal",
}


def _model_path() -> str:
    return os.path.join(MODELS_DIR, "kmeans_global.joblib")


def _scaler_path() -> str:
    return os.path.join(MODELS_DIR, "scaler_kmeans_global.joblib")


def _assign_cluster_labels(model: KMeans, scaler: StandardScaler) -> dict[int, str]:
    """Map cluster indices to semantic labels by centroid characteristics."""
    centers = scaler.inverse_transform(model.cluster_centers_)
    # centers shape: (N_CLUSTERS, len(FEATURE_COLS))
    # col 0 = total_usage_min, col 1 = nocturnal_ratio
    usage_col = 0
    nocturnal_col = 1

    # Sort by total_usage_min ascending
    usage_order = np.argsort(centers[:, usage_col])

    mapping: dict[int, str] = {}
    # Minimal: lowest usage
    mapping[int(usage_order[0])] = "minimal"
    # Nocturnal: highest nocturnal_ratio among remaining
    remaining = usage_order[1:]
    nocturnal_idx = remaining[np.argmax(centers[remaining, nocturnal_col])]
    mapping[int(nocturnal_idx)] = "nocturnal"
    # Intensive: highest usage among remaining
    others = [i for i in remaining if i != nocturnal_idx]
    intensive_idx = others[np.argmax(centers[others, usage_col])]
    mapping[int(intensive_idx)] = "intensive"
    # Moderate: whatever is left
    for i in range(N_CLUSTERS):
        if i not in mapping:
            mapping[i] = "moderate"
    return mapping


def train_kmeans(df: pd.DataFrame) -> KMeans:
    """Train K-Means global usage profiler.

    df must contain FEATURE_COLS. Always global — no per-user model.
    """
    X = df[[c for c in FEATURE_COLS if c in df.columns]].fillna(0)
    for col in FEATURE_COLS:
        if col not in X.columns:
            X[col] = 0.0
    X = X[FEATURE_COLS]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X.values)

    model = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=20, max_iter=500)
    model.fit(X_scaled)

    joblib.dump(model, _model_path())
    joblib.dump(scaler, _scaler_path())
    return model


def load_kmeans() -> tuple[KMeans, StandardScaler] | None:
    mp, sp = _model_path(), _scaler_path()
    if not (os.path.exists(mp) and os.path.exists(sp)):
        return None
    return joblib.load(mp), joblib.load(sp)


def predict_cluster(row: dict) -> dict:
    """Assign a user-day to a usage cluster.

    Returns: {cluster_label, cluster_name, profile_features}
    """
    result = load_kmeans()
    if result is None:
        return _rule_based_cluster(row)

    model, scaler = result
    x = np.array([[row.get(c, 0) for c in FEATURE_COLS]], dtype=float)
    x_scaled = scaler.transform(x)
    label = int(model.predict(x_scaled)[0])

    label_map = _assign_cluster_labels(model, scaler)
    name = label_map.get(label, "moderate")

    return {
        "cluster_label": label,
        "cluster_name": name,
        "profile_features": {c: round(float(row.get(c, 0)), 3) for c in FEATURE_COLS},
    }


def _rule_based_cluster(row: dict) -> dict:
    """Fallback when no global model is trained yet."""
    total = row.get("total_usage_min", 0)
    nocturnal = row.get("nocturnal_ratio", 0)

    if nocturnal > 0.4:
        name, label = "nocturnal", 3
    elif total < 60:
        name, label = "minimal", 0
    elif total < 240:
        name, label = "moderate", 1
    else:
        name, label = "intensive", 2

    return {
        "cluster_label": label,
        "cluster_name": name,
        "profile_features": {c: round(float(row.get(c, 0)), 3) for c in FEATURE_COLS},
    }
