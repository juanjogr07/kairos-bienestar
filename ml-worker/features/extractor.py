"""
Feature Extractor — computes daily behavioral features from usage_events.

Reads raw events from Supabase, aggregates to daily rows, writes to daily_features table.
Called by Celery tasks; also usable for backfill.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
from supabase import create_client, Client

from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)

# App-category mapping (covers common apps used in LATAM)
SOCIAL_APPS = {
    "instagram", "tiktok", "facebook", "twitter", "x", "snapchat",
    "whatsapp", "telegram", "discord", "reddit", "youtube",
}
PRODUCTIVE_APPS = {
    "gmail", "calendar", "docs", "sheets", "notion", "slack", "zoom",
    "meet", "teams", "figma", "vscode", "github", "linear",
}
NOCTURNAL_HOURS = set(range(22, 24)) | set(range(0, 6))  # 22:00–05:59


def _get_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def extract_daily_features(user_id: str, target_date: date) -> dict[str, Any]:
    """Compute all behavioral features for a single user-day.

    Pulls events from usage_events table for target_date.
    Returns a dict matching FEATURE_COLS used by all models.
    """
    client = _get_client()

    start_ts = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc).isoformat()
    end_ts = datetime.combine(target_date + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc).isoformat()

    resp = (
        client.table("usage_events")
        .select("*")
        .eq("user_id", user_id)
        .gte("started_at", start_ts)
        .lt("started_at", end_ts)
        .execute()
    )
    events = resp.data or []

    if not events:
        return _zero_features(user_id, target_date)

    df = pd.DataFrame(events)
    df["started_at"] = pd.to_datetime(df["started_at"], utc=True)
    df["ended_at"] = pd.to_datetime(df.get("ended_at", pd.NaT), utc=True, errors="coerce")
    df["duration_min"] = (
        (df["ended_at"] - df["started_at"]).dt.total_seconds() / 60
    ).fillna(0).clip(lower=0)
    df["hour"] = df["started_at"].dt.hour
    df["app_name_lower"] = df.get("app_name", "").str.lower().fillna("")

    total_usage_min = float(df["duration_min"].sum())
    session_count = len(df)

    # Nocturnal: events starting in nocturnal hours
    nocturnal_mask = df["hour"].isin(NOCTURNAL_HOURS)
    nocturnal_min = float(df.loc[nocturnal_mask, "duration_min"].sum())
    nocturnal_ratio = nocturnal_min / (total_usage_min + 1e-8)

    # Social / productive ratios
    social_mask = df["app_name_lower"].isin(SOCIAL_APPS)
    productive_mask = df["app_name_lower"].isin(PRODUCTIVE_APPS)
    social_ratio = float(df.loc[social_mask, "duration_min"].sum()) / (total_usage_min + 1e-8)
    productive_ratio = float(df.loc[productive_mask, "duration_min"].sum()) / (total_usage_min + 1e-8)

    # App switches per hour
    unique_apps_per_hour = df.groupby("hour")["app_name_lower"].nunique()
    app_switches_per_hour = float(unique_apps_per_hour.mean()) if len(unique_apps_per_hour) > 0 else 0.0

    # Max single session
    max_session_min = float(df["duration_min"].max()) if len(df) > 0 else 0.0

    # Scroll speed (px/s) — from metadata JSON if present
    avg_scroll_speed = 0.0
    if "metadata" in df.columns:
        speeds = []
        for meta in df["metadata"]:
            if isinstance(meta, dict) and "scroll_speed_pxs" in meta:
                speeds.append(float(meta["scroll_speed_pxs"]))
        avg_scroll_speed = float(np.mean(speeds)) if speeds else 0.0

    # Scroll distance (km) from metadata
    scroll_distance_km = 0.0
    if "metadata" in df.columns:
        distances = []
        for meta in df["metadata"]:
            if isinstance(meta, dict) and "scroll_distance_px" in meta:
                # assume 160dpi screen: 160px/in * 39.37in/m → 6299px/m
                distances.append(float(meta["scroll_distance_px"]) / (6299 * 1000))
        scroll_distance_km = float(sum(distances))

    # Notification count
    notification_count = int(df.get("notification_count", pd.Series([0])).sum()) if "notification_count" in df.columns else 0

    # App switches total (unique app transitions)
    app_switches = int(df["app_name_lower"].nunique())

    return {
        "user_id": user_id,
        "date": target_date.isoformat(),
        "total_usage_min": round(total_usage_min, 2),
        "nocturnal_min": round(nocturnal_min, 2),
        "nocturnal_ratio": round(float(np.clip(nocturnal_ratio, 0, 1)), 4),
        "social_ratio": round(float(np.clip(social_ratio, 0, 1)), 4),
        "productive_ratio": round(float(np.clip(productive_ratio, 0, 1)), 4),
        "avg_scroll_speed": round(avg_scroll_speed, 2),
        "session_count": session_count,
        "max_session_min": round(max_session_min, 2),
        "app_switches_per_hour": round(app_switches_per_hour, 2),
        "app_switches": app_switches,
        "scroll_distance_km": round(scroll_distance_km, 4),
        "notification_count": notification_count,
    }


def get_latest_survey_scores(user_id: str, client: Client | None = None) -> dict[str, float]:
    """Get most recent PHQ-9 and GAD-7 scores from surveys table."""
    c = client or _get_client()
    phq9, gad7 = 0.0, 0.0
    try:
        resp = (
            c.table("surveys")
            .select("type,score")
            .eq("user_id", user_id)
            .in_("type", ["phq9", "gad7"])
            .order("created_at", desc=True)
            .limit(2)
            .execute()
        )
        for row in (resp.data or []):
            if row["type"] == "phq9":
                phq9 = float(row["score"])
            elif row["type"] == "gad7":
                gad7 = float(row["score"])
    except Exception as e:
        logger.warning("Could not fetch survey scores for %s: %s", user_id, e)
    return {"phq9_score": phq9, "gad7_score": gad7}


def build_full_feature_row(user_id: str, target_date: date, anomaly_score: float = 0.0, streak_adherence_rate: float = 0.0) -> dict:
    """Build complete feature row for ML models (includes survey + derived features)."""
    features = extract_daily_features(user_id, target_date)
    survey = get_latest_survey_scores(user_id)
    features.update(survey)
    features["anomaly_score"] = round(anomaly_score, 4)
    features["streak_adherence_rate"] = round(float(np.clip(streak_adherence_rate, 0, 1)), 4)
    return features


def _zero_features(user_id: str, target_date: date) -> dict:
    return {
        "user_id": user_id,
        "date": target_date.isoformat(),
        "total_usage_min": 0.0,
        "nocturnal_min": 0.0,
        "nocturnal_ratio": 0.0,
        "social_ratio": 0.0,
        "productive_ratio": 0.0,
        "avg_scroll_speed": 0.0,
        "session_count": 0,
        "max_session_min": 0.0,
        "app_switches_per_hour": 0.0,
        "app_switches": 0,
        "scroll_distance_km": 0.0,
        "notification_count": 0,
    }


def get_user_feature_history(user_id: str, days: int = 90) -> pd.DataFrame:
    """Fetch saved daily_features rows for a user (for training/forecast)."""
    client = _get_client()
    since = (datetime.utcnow() - timedelta(days=days)).date().isoformat()
    resp = (
        client.table("daily_features")
        .select("*")
        .eq("user_id", user_id)
        .gte("date", since)
        .order("date", desc=False)
        .execute()
    )
    rows = resp.data or []
    return pd.DataFrame(rows) if rows else pd.DataFrame()


def upsert_daily_features(features: dict, client: Client | None = None) -> None:
    """Persist a daily feature row to Supabase (upsert by user_id + date)."""
    c = client or _get_client()
    c.table("daily_features").upsert(features, on_conflict="user_id,date").execute()
