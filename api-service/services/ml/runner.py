"""
ML runner — orquestador diario de modelos (KAI-51 / KAI-52).

Responsibilities:
- Fetch usage_events from Supabase for each user (last 7 days)
- Extract features via features.py
- Score via isolation_forest.score_user() and xgboost_mood.predict_mood_change()
- Upsert results to ml_results (one row per user per day per model_type)

Entry points:
    run_isolation_forest_for_user(user_id, supabase_client)
    run_isolation_forest_all_users(supabase_client)
    run_xgboost_mood_for_user(user_id, supabase_client)
    run_all_models_for_user(user_id, supabase_client)
    run_all_models_all_users(supabase_client)
"""
import logging
from datetime import date, timedelta

from services.ml.features import extract_features_from_events
from services.ml.isolation_forest import score_user
from services.ml.xgboost_mood import predict_mood_change

logger = logging.getLogger(__name__)

MODEL_TYPE = "isolation_forest"
LOOKBACK_DAYS = 7
MIN_EVENTS = 3  # skip users with too little data


def _fetch_events(user_id: str, supabase, since: str) -> list[dict]:
    res = (
        supabase.table("usage_events")
        .select("domain, duration_seconds, timestamp, scroll_speed")
        .eq("user_id", user_id)
        .gte("timestamp", since)
        .execute()
    )
    return res.data or []


def _upsert_result(user_id: str, result: dict, today: str, supabase) -> None:
    """Insert or update ml_results for this user+model_type on today's date."""
    existing = (
        supabase.table("ml_results")
        .select("id")
        .eq("user_id", user_id)
        .eq("model_type", MODEL_TYPE)
        .gte("computed_at", today)
        .lt("computed_at", _next_day(today))
        .execute()
    )

    payload = {
        "user_id": user_id,
        "model_type": MODEL_TYPE,
        "result": result,
        "computed_at": f"{today}T00:00:00",
    }

    if existing.data:
        supabase.table("ml_results").update({"result": result}).eq(
            "id", existing.data[0]["id"]
        ).execute()
    else:
        supabase.table("ml_results").insert(payload).execute()


def _next_day(iso_date: str) -> str:
    d = date.fromisoformat(iso_date)
    return (d + timedelta(days=1)).isoformat()


def run_isolation_forest_for_user(user_id: str, supabase) -> dict | None:
    """
    Score one user and upsert to ml_results.
    Returns the result dict, or None if user has insufficient data.
    """
    today = date.today().isoformat()
    since = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    events = _fetch_events(user_id, supabase, since)
    if len(events) < MIN_EVENTS:
        logger.info("User %s: only %d events — skipping", user_id, len(events))
        return None

    features = extract_features_from_events(events)
    result = score_user(features)

    _upsert_result(user_id, result, today, supabase)
    logger.info(
        "User %s scored: risk_level=%s anomaly=%s",
        user_id,
        result["risk_level"],
        result["is_anomaly"],
    )
    return result


def run_isolation_forest_all_users(supabase) -> dict[str, dict]:
    """
    Fetch all distinct users with recent events and score each one.
    Returns mapping user_id → result.
    """
    since = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    res = (
        supabase.table("usage_events")
        .select("user_id")
        .gte("timestamp", since)
        .execute()
    )

    user_ids = list({row["user_id"] for row in (res.data or [])})
    logger.info("Running Isolation Forest for %d users", len(user_ids))

    results = {}
    for uid in user_ids:
        result = run_isolation_forest_for_user(uid, supabase)
        if result is not None:
            results[uid] = result

    return results


def run_xgboost_mood_for_user(user_id: str, supabase) -> dict | None:
    """
    Predict mood change for one user and upsert to ml_results.
    Returns the result dict, or None if user has insufficient data.
    """
    today = date.today().isoformat()
    since = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    events = _fetch_events(user_id, supabase, since)
    if len(events) < MIN_EVENTS:
        logger.info("User %s: only %d events — skipping xgboost", user_id, len(events))
        return None

    features = extract_features_from_events(events)
    result = predict_mood_change(features)

    _upsert_result_for_model(user_id, result, "xgboost_mood", today, supabase)
    logger.info(
        "User %s mood prediction: direction=%s confidence=%.2f",
        user_id,
        result["direction"],
        result["confidence"],
    )
    return result


def run_all_models_for_user(user_id: str, supabase) -> dict[str, dict]:
    """Run all ML models for a single user. Returns dict keyed by model_type."""
    today = date.today().isoformat()
    since = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    events = _fetch_events(user_id, supabase, since)
    if len(events) < MIN_EVENTS:
        return {}

    features = extract_features_from_events(events)
    results = {}

    iso_result = score_user(features)
    _upsert_result_for_model(user_id, iso_result, "isolation_forest", today, supabase)
    results["isolation_forest"] = iso_result

    xgb_result = predict_mood_change(features)
    _upsert_result_for_model(user_id, xgb_result, "xgboost_mood", today, supabase)
    results["xgboost_mood"] = xgb_result

    return results


def run_all_models_all_users(supabase) -> dict[str, dict]:
    """Run all models for all users with recent events."""
    since = (date.today() - timedelta(days=LOOKBACK_DAYS)).isoformat()

    res = (
        supabase.table("usage_events")
        .select("user_id")
        .gte("timestamp", since)
        .execute()
    )

    user_ids = list({row["user_id"] for row in (res.data or [])})
    logger.info("Running all ML models for %d users", len(user_ids))

    results = {}
    for uid in user_ids:
        user_results = run_all_models_for_user(uid, supabase)
        if user_results:
            results[uid] = user_results

    return results


def _upsert_result_for_model(
    user_id: str, result: dict, model_type: str, today: str, supabase
) -> None:
    existing = (
        supabase.table("ml_results")
        .select("id")
        .eq("user_id", user_id)
        .eq("model_type", model_type)
        .gte("computed_at", today)
        .lt("computed_at", _next_day(today))
        .execute()
    )

    if existing.data:
        supabase.table("ml_results").update({"result": result}).eq(
            "id", existing.data[0]["id"]
        ).execute()
    else:
        supabase.table("ml_results").insert({
            "user_id": user_id,
            "model_type": model_type,
            "result": result,
            "computed_at": f"{today}T00:00:00",
        }).execute()
