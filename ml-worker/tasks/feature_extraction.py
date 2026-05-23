"""
Celery tasks — Feature Extraction

compute_user_features: compute features for one user-day and persist to daily_features.
compute_all_users: nightly batch that runs compute_user_features for every active user.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from ml_worker.celery_app import app
from ml_worker.features.extractor import (
    build_full_feature_row,
    upsert_daily_features,
)

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def compute_user_features(self, user_id: str, target_date_str: str | None = None) -> dict:
    """Compute and persist daily features for one user.

    target_date_str: ISO date string (YYYY-MM-DD). Defaults to yesterday.
    """
    target_date = (
        date.fromisoformat(target_date_str)
        if target_date_str
        else (datetime.now(timezone.utc) - timedelta(days=1)).date()
    )
    try:
        row = build_full_feature_row(user_id, target_date)
        upsert_daily_features(row)
        logger.info("Features computed for user=%s date=%s", user_id, target_date)
        return {"status": "ok", "user_id": user_id, "date": target_date.isoformat()}
    except Exception as exc:
        logger.error("Feature extraction failed for %s: %s", user_id, exc)
        raise self.retry(exc=exc)


@app.task
def compute_all_users() -> dict:
    """Nightly task: compute features for all users active in last 30 days."""
    from supabase import create_client
    from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    resp = (
        client.table("usage_events")
        .select("user_id")
        .gte("started_at", since)
        .execute()
    )
    user_ids = list({row["user_id"] for row in (resp.data or [])})
    logger.info("Dispatching feature extraction for %d users", len(user_ids))

    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()
    for uid in user_ids:
        compute_user_features.delay(uid, yesterday)

    return {"dispatched": len(user_ids), "date": yesterday}
