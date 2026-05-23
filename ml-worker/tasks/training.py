"""
Celery tasks — Training

retrain_global_models: Sunday 3am — retrain Isolation Forest + XGBoost + K-Means on all data.
retrain_personal_model: triggered when a user crosses 30-day threshold.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

import pandas as pd

from ml_worker.celery_app import app
from ml_worker.config import PERSONALIZATION_MIN_DAYS

logger = logging.getLogger(__name__)


def _load_all_features(days: int = 180) -> pd.DataFrame:
    """Pull daily_features rows for the past N days across all users."""
    from supabase import create_client
    from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    since = (datetime.now(timezone.utc) - timedelta(days=days)).date().isoformat()
    resp = (
        client.table("daily_features")
        .select("*")
        .gte("date", since)
        .execute()
    )
    rows = resp.data or []
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def _load_user_features(user_id: str) -> pd.DataFrame:
    from supabase import create_client
    from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    resp = (
        client.table("daily_features")
        .select("*")
        .eq("user_id", user_id)
        .order("date", desc=False)
        .execute()
    )
    rows = resp.data or []
    return pd.DataFrame(rows) if rows else pd.DataFrame()


@app.task
def retrain_global_models() -> dict:
    """Weekly retrain of all global models on latest data."""
    from ml_worker.models.anomaly import train_isolation_forest
    from ml_worker.models.scoring import train_xgboost
    from ml_worker.models.clustering import train_kmeans
    from ml_worker.pipelines.cold_start import ensure_global_models

    logger.info("Starting global model retraining")
    df = _load_all_features(days=180)

    if df.empty:
        logger.warning("No training data found — running cold start bootstrap")
        ensure_global_models()
        return {"status": "cold_start"}

    results = {}
    try:
        train_isolation_forest(df, user_id=None)
        results["isolation_forest"] = "ok"
    except Exception as e:
        logger.error("IF retrain failed: %s", e)
        results["isolation_forest"] = str(e)

    try:
        train_xgboost(df, user_id=None)
        results["xgboost"] = "ok"
    except Exception as e:
        logger.error("XGBoost retrain failed: %s", e)
        results["xgboost"] = str(e)

    try:
        train_kmeans(df)
        results["kmeans"] = "ok"
    except Exception as e:
        logger.error("KMeans retrain failed: %s", e)
        results["kmeans"] = str(e)

    logger.info("Global retraining complete: %s", results)
    return {"status": "ok", "models": results, "rows_used": len(df)}


@app.task(bind=True, max_retries=2)
def retrain_personal_model(self, user_id: str) -> dict:
    """Retrain personal IF + XGBoost for a specific user.

    Called automatically when user crosses PERSONALIZATION_MIN_DAYS threshold.
    """
    from ml_worker.models.anomaly import train_isolation_forest
    from ml_worker.models.scoring import train_xgboost
    from ml_worker.models.timeseries import train_prophet

    df = _load_user_features(user_id)
    if len(df) < PERSONALIZATION_MIN_DAYS:
        return {"status": "skipped", "reason": f"need {PERSONALIZATION_MIN_DAYS} days, have {len(df)}"}

    results = {}
    try:
        train_isolation_forest(df, user_id=user_id)
        results["isolation_forest"] = "ok"
    except Exception as e:
        logger.error("Personal IF failed for %s: %s", user_id, e)
        results["isolation_forest"] = str(e)

    try:
        train_xgboost(df, user_id=user_id)
        results["xgboost"] = "ok"
    except Exception as e:
        logger.error("Personal XGBoost failed for %s: %s", user_id, e)
        results["xgboost"] = str(e)

    # Prophet needs date column
    if "date" in df.columns:
        try:
            df["date"] = pd.to_datetime(df["date"])
            train_prophet(df, user_id=user_id, target_col="total_usage_min")
            results["prophet"] = "ok"
        except Exception as e:
            logger.error("Prophet failed for %s: %s", user_id, e)
            results["prophet"] = str(e)

    logger.info("Personal retraining complete for user=%s: %s", user_id, results)
    return {"status": "ok", "user_id": user_id, "rows_used": len(df), "models": results}


@app.task
def check_personalization_eligibility() -> dict:
    """Daily check: find users who just crossed 30-day threshold and trigger personal retraining."""
    from supabase import create_client
    from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    # Get all users and their feature day counts
    resp = client.table("daily_features").select("user_id", count="exact").execute()
    if not resp.data:
        return {"dispatched": 0}

    df = pd.DataFrame(resp.data)
    counts = df.groupby("user_id").size()
    eligible = counts[counts >= PERSONALIZATION_MIN_DAYS].index.tolist()

    dispatched = 0
    for uid in eligible:
        retrain_personal_model.delay(uid)
        dispatched += 1

    return {"dispatched": dispatched, "eligible_users": len(eligible)}
