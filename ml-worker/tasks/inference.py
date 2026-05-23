"""
Celery tasks — Inference

run_inference_for_user: runs all models for one user-day and saves results to ml_results.
run_inference_all_users: nightly batch that dispatches run_inference_for_user.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone

from ml_worker.celery_app import app

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_inference_for_user(self, user_id: str, target_date_str: str | None = None) -> dict:
    """Run all ML models for a user-day and persist results.

    Pipeline:
      1. Load daily feature row from daily_features
      2. anomaly.predict_anomaly → anomaly_score
      3. scoring.predict_triage_scores → 5 triage signals
      4. clustering.predict_cluster → usage profile
      5. Persist all results to ml_results (JSONB)
    """
    from supabase import create_client
    from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY
    from ml_worker.models.anomaly import predict_anomaly
    from ml_worker.models.scoring import predict_triage_scores
    from ml_worker.models.clustering import predict_cluster

    target_date = (
        date.fromisoformat(target_date_str)
        if target_date_str
        else (datetime.now(timezone.utc) - timedelta(days=1)).date()
    )

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Load feature row
    resp = (
        client.table("daily_features")
        .select("*")
        .eq("user_id", user_id)
        .eq("date", target_date.isoformat())
        .single()
        .execute()
    )
    if not resp.data:
        logger.warning("No features found for user=%s date=%s — skipping inference", user_id, target_date)
        return {"status": "skipped", "reason": "no_features"}

    row = resp.data

    try:
        anomaly = predict_anomaly(row, user_id)
        # Inject anomaly_score back into row so XGBoost can use it
        row["anomaly_score"] = anomaly["anomaly_score"]

        triage = predict_triage_scores(row, user_id)
        cluster = predict_cluster(row)

        result_payload = {
            "user_id": user_id,
            "date": target_date.isoformat(),
            "model_type": "full_pipeline",
            "result": {
                "anomaly": anomaly,
                "triage": triage,
                "cluster": cluster,
                "computed_at": datetime.now(timezone.utc).isoformat(),
            },
        }

        client.table("ml_results").upsert(result_payload, on_conflict="user_id,date,model_type").execute()
        logger.info("Inference complete for user=%s date=%s", user_id, target_date)
        return {"status": "ok", "user_id": user_id, "date": target_date.isoformat()}

    except Exception as exc:
        logger.error("Inference failed for user=%s: %s", user_id, exc)
        raise self.retry(exc=exc)


@app.task
def run_inference_all_users() -> dict:
    """Nightly batch: run inference for all users who have features for yesterday."""
    from supabase import create_client
    from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).date().isoformat()

    resp = (
        client.table("daily_features")
        .select("user_id")
        .eq("date", yesterday)
        .execute()
    )
    user_ids = list({row["user_id"] for row in (resp.data or [])})
    logger.info("Dispatching inference for %d users on %s", len(user_ids), yesterday)

    for uid in user_ids:
        run_inference_for_user.delay(uid, yesterday)

    return {"dispatched": len(user_ids), "date": yesterday}
