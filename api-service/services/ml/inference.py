"""
Direct ML inference using saved global models.
Bypasses Redis/Celery — suitable for MVP sync calls.

Feature order MUST match training (cold_start.py):
  IF  (6):  total_usage_min, nocturnal_min, session_count,
            app_switches, scroll_distance_norm, notification_count
  KM  (6):  total_usage_min, nocturnal_ratio, social_ratio,
            productive_ratio, session_count, avg_scroll_speed
  XGB (14): total_usage_min, nocturnal_min, nocturnal_ratio, social_ratio,
            productive_ratio, avg_scroll_speed, session_count, max_session_min,
            scroll_distance_km, notification_count, phq9_score, gad7_score,
            anomaly_score, streak_adherence_rate
  XGB outputs (5): attention_fragmentation, nocturnal_pattern, doomscrolling,
                   mood_risk, relapse_risk
"""
import os
import numpy as np

_HERE = os.path.dirname(os.path.abspath(__file__))
_MODELS_DIR = os.path.normpath(os.path.join(_HERE, "../../../ml-worker/saved_models"))

_cache: dict = {}


def _load(name):
    if name not in _cache:
        import joblib
        path = os.path.join(_MODELS_DIR, name)
        _cache[name] = joblib.load(path)
    return _cache[name]


def run_full_inference(
    features: dict,
    phq9_score: float = 0.0,
    gad7_score: float = 0.0,
) -> dict:
    """Run IF + KMeans + XGBoost on daily behavioral features.

    Returns a dict compatible with the ml_results.result JSONB schema.
    """
    # ── Isolation Forest ──────────────────────────────────────────────────
    # IF feature order (from ml-worker/models/anomaly.py FEATURE_COLS):
    # total_usage_min, nocturnal_min, session_count,
    # app_switches (raw daily count), scroll_distance_km, notification_count
    if_vec = np.array([[
        features["total_usage_min"],
        features["nocturnal_min"],
        features["session_count"],
        features["app_switches"],
        features["scroll_distance_km"],
        features["notification_count"],
    ]])
    if_scaled = _load("scaler_if_global.joblib").transform(if_vec)
    if_model = _load("if_global.joblib")
    raw_score = float(-if_model.score_samples(if_scaled)[0])   # higher = more anomalous
    anomaly_flag = bool(if_model.predict(if_scaled)[0] == -1)
    anomaly_severity = float(np.clip((raw_score - 0.3) / 0.4, 0.0, 1.0))

    # ── KMeans ────────────────────────────────────────────────────────────
    km_vec = np.array([[
        features["total_usage_min"],
        features["nocturnal_ratio"],
        features["social_ratio"],
        features["productive_ratio"],
        features["session_count"],
        features["avg_scroll_speed"],
    ]])
    km_scaled = _load("scaler_kmeans_global.joblib").transform(km_vec)
    km_model = _load("kmeans_global.joblib")
    cluster = int(km_model.predict(km_scaled)[0])
    dists = km_model.transform(km_scaled)[0]
    confidence = float(1.0 - dists[cluster] / (dists.sum() + 1e-9))
    _CLUSTER_NAMES = {0: "minimal", 1: "moderate", 2: "binge", 3: "nocturnal"}

    # ── XGBoost ───────────────────────────────────────────────────────────
    # XGB feature order (from ml-worker/models/scoring.py FEATURE_COLS):
    xgb_vec = np.array([[
        features["total_usage_min"],        # 0
        features["nocturnal_min"],          # 1
        features["nocturnal_ratio"],        # 2
        features["social_ratio"],           # 3
        features["productive_ratio"],       # 4
        features["avg_scroll_speed"],       # 5
        features["session_count"],          # 6
        features["max_session_min"],        # 7
        features["app_switches_per_hour"],  # 8
        features["notification_count"],     # 9
        phq9_score,                         # 10
        gad7_score,                         # 11
        raw_score,                          # 12 anomaly_score from IF
        features.get("streak_adherence_rate", 0.7),  # 13
    ]])
    xgb_scaled = _load("scaler_xgb_global.joblib").transform(xgb_vec)
    xgb_preds = _load("xgb_global.joblib").predict(xgb_scaled)[0]   # 5 floats

    def _clip(v):
        return float(np.clip(v, 0.0, 1.0))

    return {
        "model_type": "full_pipeline",
        "result": {
            "triage": {
                "attention_fragmentation_score": _clip(xgb_preds[0]),
                "nocturnal_pattern_score":       _clip(xgb_preds[1]),
                "doomscrolling_score":           _clip(xgb_preds[2]),
                "has_ml_data": True,
            },
            "anomaly": {
                "anomaly_score":    raw_score,
                "anomaly_flag":     anomaly_flag,
                "anomaly_severity": anomaly_severity,
                "flagged_features": [],
            },
            "cluster": {
                "cluster_label": cluster,
                "cluster_name":  _CLUSTER_NAMES.get(cluster, "unknown"),
                "confidence":    confidence,
            },
        },
    }


def models_available() -> bool:
    try:
        required = [
            "if_global.joblib", "scaler_if_global.joblib",
            "kmeans_global.joblib", "scaler_kmeans_global.joblib",
            "xgb_global.joblib", "scaler_xgb_global.joblib",
        ]
        return all(os.path.exists(os.path.join(_MODELS_DIR, f)) for f in required)
    except Exception:
        return False
