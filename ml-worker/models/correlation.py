"""
Modelo 6 — Behavioral-Mood Correlator  (Fase 2)

Calcula correlaciones Pearson + Spearman entre features conductuales y PHQ-9/GAD-7.
Identifica qué comportamientos son predictores de bajo estado de ánimo para ese usuario.

Output: correlations (dict), top_predictors (list), data_points (int)
"""
from __future__ import annotations

import os
import json

import numpy as np
import pandas as pd
from scipy import stats

from ml_worker.config import MODELS_DIR, CORRELATION_MIN_SURVEYS

BEHAVIORAL_COLS = [
    "total_usage_min",
    "nocturnal_min",
    "nocturnal_ratio",
    "social_ratio",
    "productive_ratio",
    "avg_scroll_speed",
    "session_count",
    "app_switches_per_hour",
    "notification_count",
]

MOOD_COLS = ["phq9_score", "gad7_score"]


def _corr_path(user_id: str) -> str:
    return os.path.join(MODELS_DIR, f"corr_{user_id}.json")


def compute_correlations(df: pd.DataFrame, user_id: str) -> dict:
    """Compute behavioral-mood correlations for a user.

    df must have BEHAVIORAL_COLS + MOOD_COLS and a 'date' column.
    Requires at least CORRELATION_MIN_SURVEYS rows with non-null mood scores.
    """
    mood_df = df.dropna(subset=MOOD_COLS)
    if len(mood_df) < CORRELATION_MIN_SURVEYS:
        return {"error": f"need ≥{CORRELATION_MIN_SURVEYS} surveys, have {len(mood_df)}"}

    results: dict = {"user_id": user_id, "data_points": len(mood_df), "correlations": {}}

    for mood_col in MOOD_COLS:
        y = mood_df[mood_col].values.astype(float)
        col_results = {}
        for feat in BEHAVIORAL_COLS:
            if feat not in mood_df.columns:
                continue
            x = mood_df[feat].fillna(0).values.astype(float)
            if np.std(x) < 1e-8:
                continue
            pearson_r, pearson_p = stats.pearsonr(x, y)
            spearman_r, spearman_p = stats.spearmanr(x, y)
            col_results[feat] = {
                "pearson_r": round(float(pearson_r), 4),
                "pearson_p": round(float(pearson_p), 4),
                "spearman_r": round(float(spearman_r), 4),
                "spearman_p": round(float(spearman_p), 4),
                "significant": bool(pearson_p < 0.05 or spearman_p < 0.05),
            }
        results["correlations"][mood_col] = col_results

    # Top predictors: features with |pearson_r| > 0.3 and p < 0.05 for PHQ-9
    top: list[dict] = []
    phq_corrs = results["correlations"].get("phq9_score", {})
    for feat, vals in phq_corrs.items():
        if abs(vals["pearson_r"]) > 0.3 and vals["pearson_p"] < 0.05:
            top.append({"feature": feat, "r": vals["pearson_r"], "direction": "positive" if vals["pearson_r"] > 0 else "negative"})
    top.sort(key=lambda x: abs(x["r"]), reverse=True)
    results["top_predictors"] = top[:5]

    # Persist
    with open(_corr_path(user_id), "w") as f:
        json.dump(results, f, indent=2)

    return results


def load_correlations(user_id: str) -> dict | None:
    path = _corr_path(user_id)
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def get_top_predictors(user_id: str) -> list[dict]:
    """Return cached top behavioral predictors for a user."""
    corrs = load_correlations(user_id)
    if corrs is None:
        return []
    return corrs.get("top_predictors", [])
