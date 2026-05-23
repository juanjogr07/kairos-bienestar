"""
Personalization Pipeline — fine-tunes models for individual users.

Called automatically when a user reaches PERSONALIZATION_MIN_DAYS of data.
Can also be triggered manually for testing.
"""
from __future__ import annotations

import logging

from ml_worker.config import PERSONALIZATION_MIN_DAYS

logger = logging.getLogger(__name__)


def personalize_user(user_id: str, dry_run: bool = False) -> dict:
    """Run full personalization pipeline for a user.

    1. Check data sufficiency
    2. Load user feature history
    3. Train personal IF, XGBoost, Prophet
    4. Return status + model paths
    """
    from ml_worker.features.extractor import get_user_feature_history
    from ml_worker.models.anomaly import train_isolation_forest
    from ml_worker.models.scoring import train_xgboost
    from ml_worker.models.timeseries import train_prophet

    import pandas as pd

    df = get_user_feature_history(user_id, days=365)
    if df.empty or len(df) < PERSONALIZATION_MIN_DAYS:
        return {
            "status": "insufficient_data",
            "user_id": user_id,
            "data_days": len(df),
            "required": PERSONALIZATION_MIN_DAYS,
        }

    if dry_run:
        return {
            "status": "dry_run",
            "user_id": user_id,
            "data_days": len(df),
            "would_train": ["isolation_forest", "xgboost", "prophet"],
        }

    results = {}

    try:
        train_isolation_forest(df, user_id=user_id)
        results["isolation_forest"] = "ok"
    except Exception as e:
        results["isolation_forest"] = f"error: {e}"
        logger.error("Personalization IF failed for %s: %s", user_id, e)

    try:
        train_xgboost(df, user_id=user_id)
        results["xgboost"] = "ok"
    except Exception as e:
        results["xgboost"] = f"error: {e}"
        logger.error("Personalization XGBoost failed for %s: %s", user_id, e)

    if "date" in df.columns:
        try:
            df["date"] = pd.to_datetime(df["date"])
            train_prophet(df, user_id=user_id, target_col="total_usage_min")
            results["prophet_usage"] = "ok"
        except Exception as e:
            results["prophet_usage"] = f"error: {e}"

    logger.info("Personalization complete for %s: %s", user_id, results)
    return {
        "status": "ok",
        "user_id": user_id,
        "data_days": len(df),
        "models": results,
    }
