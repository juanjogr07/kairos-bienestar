"""
Cold Start Pipeline — bootstraps global models with synthetic + public data.

Run once on first deploy:
  python -m ml_worker.pipelines.cold_start

Generates synthetic training data that mimics real behavioral distributions
drawn from StudentLife / TILES research baselines, then trains all global models.
"""
from __future__ import annotations

import logging
import os

import numpy as np
import pandas as pd

from ml_worker.config import MODELS_DIR

logger = logging.getLogger(__name__)

RNG = np.random.default_rng(42)

N_USERS = 500
N_DAYS_PER_USER = 60


def _generate_synthetic_features(n_users: int = N_USERS, n_days: int = N_DAYS_PER_USER) -> pd.DataFrame:
    """Generate realistic behavioral feature distributions.

    Based on: StudentLife 2014 (Dartmouth), TILES-2018 (USC) baselines.
    Produces 3 user archetypes: healthy (60%), at-risk (25%), high-risk (15%).
    """
    rows = []
    for _ in range(n_users):
        archetype = RNG.choice(["healthy", "at_risk", "high_risk"], p=[0.60, 0.25, 0.15])

        if archetype == "healthy":
            base_usage = RNG.normal(180, 40)
            base_nocturnal_ratio = RNG.beta(1.5, 8)
            base_phq9 = RNG.choice(range(0, 8), p=[0.3, 0.25, 0.2, 0.1, 0.05, 0.04, 0.03, 0.03])
            base_gad7 = RNG.choice(range(0, 7), p=[0.35, 0.25, 0.2, 0.1, 0.05, 0.03, 0.02])
        elif archetype == "at_risk":
            base_usage = RNG.normal(310, 60)
            base_nocturnal_ratio = RNG.beta(3, 7)
            base_phq9 = RNG.choice(range(5, 15), p=[0.15, 0.15, 0.15, 0.12, 0.12, 0.1, 0.08, 0.06, 0.04, 0.03])
            base_gad7 = RNG.choice(range(5, 15), p=[0.15, 0.15, 0.15, 0.12, 0.12, 0.1, 0.08, 0.06, 0.04, 0.03])
        else:  # high_risk
            base_usage = RNG.normal(450, 90)
            base_nocturnal_ratio = RNG.beta(5, 5)
            base_phq9 = RNG.integers(15, 28)
            base_gad7 = RNG.integers(15, 22)

        user_id = f"synthetic_{_:04d}"
        for day in range(n_days):
            noise = RNG.normal(0, 0.05)
            total_usage_min = float(np.clip(base_usage + RNG.normal(0, 30), 0, 720))
            nocturnal_ratio = float(np.clip(base_nocturnal_ratio + noise, 0, 1))
            nocturnal_min = total_usage_min * nocturnal_ratio
            social_ratio = float(np.clip(RNG.beta(3, 5) + noise, 0, 1))
            productive_ratio = float(np.clip(RNG.beta(2, 5) + noise, 0, 1))
            session_count = int(np.clip(RNG.poisson(12 + total_usage_min / 30), 1, 80))
            max_session_min = float(np.clip(RNG.exponential(40), 1, total_usage_min + 1))
            app_switches_per_hour = float(np.clip(RNG.poisson(8), 0, 30))
            avg_scroll_speed = float(np.clip(RNG.normal(800, 200), 0, 2000))
            notification_count = int(np.clip(RNG.poisson(40), 0, 200))
            app_switches = int(np.clip(RNG.poisson(15), 1, 50))
            scroll_distance_km = float(np.clip(RNG.exponential(0.5), 0, 5))

            rows.append({
                "user_id": user_id,
                "date": (pd.Timestamp("2025-01-01") + pd.Timedelta(days=day)).date().isoformat(),
                "total_usage_min": round(total_usage_min, 2),
                "nocturnal_min": round(nocturnal_min, 2),
                "nocturnal_ratio": round(nocturnal_ratio, 4),
                "social_ratio": round(social_ratio, 4),
                "productive_ratio": round(productive_ratio, 4),
                "avg_scroll_speed": round(avg_scroll_speed, 2),
                "session_count": session_count,
                "max_session_min": round(max_session_min, 2),
                "app_switches_per_hour": round(app_switches_per_hour, 2),
                "app_switches": app_switches,
                "scroll_distance_km": round(scroll_distance_km, 4),
                "notification_count": notification_count,
                "phq9_score": float(base_phq9 + RNG.integers(-1, 2)),
                "gad7_score": float(base_gad7 + RNG.integers(-1, 2)),
                "anomaly_score": 0.0,
                "streak_adherence_rate": float(np.clip(RNG.beta(5, 2), 0, 1)),
            })

    return pd.DataFrame(rows)


def ensure_global_models(force: bool = False) -> dict:
    """Train all global models if they don't exist (or force=True).

    Returns status dict with which models were trained.
    """
    from ml_worker.models.anomaly import train_isolation_forest
    from ml_worker.models.scoring import train_xgboost
    from ml_worker.models.clustering import train_kmeans

    status = {}
    models_needed = {
        "if_global.joblib": ("isolation_forest", lambda df: train_isolation_forest(df, user_id=None)),
        "xgb_global.joblib": ("xgboost", lambda df: train_xgboost(df, user_id=None)),
        "kmeans_global.joblib": ("kmeans", train_kmeans),
    }

    need_training = force or any(
        not os.path.exists(os.path.join(MODELS_DIR, fname))
        for fname in models_needed
    )

    if not need_training:
        logger.info("All global models already exist. Use force=True to retrain.")
        return {"status": "already_exists"}

    logger.info("Generating synthetic training data (%d users × %d days)...", N_USERS, N_DAYS_PER_USER)
    df = _generate_synthetic_features()
    logger.info("Generated %d training rows", len(df))

    for fname, (name, train_fn) in models_needed.items():
        path = os.path.join(MODELS_DIR, fname)
        if force or not os.path.exists(path):
            try:
                train_fn(df)
                status[name] = "trained"
                logger.info("Trained %s → %s", name, path)
            except Exception as e:
                status[name] = f"error: {e}"
                logger.error("Failed to train %s: %s", name, e)
        else:
            status[name] = "skipped_exists"

    return {"status": "ok", "models": status, "training_rows": len(df)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    result = ensure_global_models(force=False)
    print(result)
