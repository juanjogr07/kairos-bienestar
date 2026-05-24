#!/usr/bin/env python3
"""
Standalone inference runner — no Celery required.

Reads daily_features + survey_responses for every user, runs the full ML
pipeline (rule-based triage + anomaly + cluster), and writes a `full_pipeline`
record to ml_results so agent-service can read real scores.

Run from repo root:
    python ml-worker/run_inference_now.py
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def map_features(jsonb: dict, phq9: float, gad7: float) -> dict:
    """Map daily_features JSONB fields → ml-worker feature vector."""
    screen_hours = float(jsonb.get("screen_hours", 3.0))
    nocturnal_ratio = float(jsonb.get("nocturnal_ratio", 0.0))
    focus_sessions = int(jsonb.get("focus_sessions", 0))
    morning_mood = float(jsonb.get("morning_mood", 3.0))

    total_usage_min = screen_hours * 60
    nocturnal_min = nocturnal_ratio * total_usage_min
    session_count = max(0.0, 30.0 - focus_sessions * 6.0)
    app_switches_per_hour = max(0.0, 20.0 - focus_sessions * 4.0)
    social_ratio = min(0.7, (5.0 - morning_mood) / 5.0 * 0.5 + nocturnal_ratio * 0.3)
    avg_scroll_speed = 900.0 if nocturnal_ratio > 0.3 else 400.0

    return {
        "total_usage_min": total_usage_min,
        "nocturnal_min": nocturnal_min,
        "nocturnal_ratio": nocturnal_ratio,
        "social_ratio": social_ratio,
        "productive_ratio": min(0.8, focus_sessions / 5.0),
        "avg_scroll_speed": avg_scroll_speed,
        "session_count": session_count,
        "max_session_min": total_usage_min * 0.4,
        "app_switches_per_hour": app_switches_per_hour,
        "notification_count": 30.0,
        "phq9_score": float(phq9),
        "gad7_score": float(gad7),
        "anomaly_score": 0.0,
        "streak_adherence_rate": 0.5,
    }


def rule_based_triage(row: dict) -> dict:
    return {
        "attention_fragmentation": round(min(
            (row["session_count"] / 30) * 0.5 + (row["app_switches_per_hour"] / 20) * 0.5, 1.0
        ), 4),
        "nocturnal_pattern": round(min(
            row["nocturnal_ratio"] * 0.6 + (row["nocturnal_min"] / 120) * 0.4, 1.0
        ), 4),
        "doomscrolling": round(min(
            (row["avg_scroll_speed"] / 1500) * 0.4
            + row["social_ratio"] * 0.35
            + (row["total_usage_min"] / 480) * 0.25,
            1.0,
        ), 4),
        "low_mood_indicator": round(min(row["phq9_score"] / 27, 1.0), 4),
        "anxiety_indicator": round(min(row["gad7_score"] / 21, 1.0), 4),
        "model": "rule_based",
    }


def rule_based_anomaly(row: dict) -> dict:
    score = 0.0
    flagged = []
    if row["total_usage_min"] > 480:
        score += 0.3
        flagged.append("total_usage_min")
    if row["nocturnal_min"] > 90:
        score += 0.25
        flagged.append("nocturnal_min")
    if row["session_count"] > 50:
        score += 0.2
        flagged.append("session_count")
    score = min(score, 1.0)
    return {
        "anomaly_score": round(score, 4),
        "is_anomaly": score > 0.5,
        "risk_level": "high" if score > 0.75 else ("medium" if score > 0.4 else "low"),
        "flagged_features": flagged,
    }


def get_cluster_from_db(user_id: str) -> dict:
    resp = (
        client.table("ml_results")
        .select("result")
        .eq("user_id", user_id)
        .eq("model_type", "kmeans_cluster")
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )
    if resp.data:
        r = resp.data[0]["result"]
        if isinstance(r, str):
            r = json.loads(r)
        return {
            "cluster_name": r.get("profile", r.get("cluster_name", "general_user")),
            "cluster_label": int(r.get("cluster", r.get("cluster_label", 0))),
            "confidence": float(r.get("confidence", 0.7)),
        }
    return {"cluster_name": "general_user", "cluster_label": 0, "confidence": 0.5}


def get_latest_surveys(user_id: str) -> tuple[float, float]:
    def latest(survey_type: str) -> float:
        r = (
            client.table("survey_responses")
            .select("total_score")
            .eq("user_id", user_id)
            .eq("survey_type", survey_type)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return float(r.data[0]["total_score"]) if r.data else 0.0

    return latest("phq9"), latest("gad7")


def run_for_user(user_id: str) -> dict:
    resp = (
        client.table("daily_features")
        .select("date,features")
        .eq("user_id", user_id)
        .order("date", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return {"status": "skipped", "reason": "no_daily_features"}

    row_date = resp.data[0]["date"]
    jsonb = resp.data[0]["features"]
    if isinstance(jsonb, str):
        jsonb = json.loads(jsonb)

    phq9, gad7 = get_latest_surveys(user_id)
    features = map_features(jsonb, phq9, gad7)

    anomaly = rule_based_anomaly(features)
    features["anomaly_score"] = anomaly["anomaly_score"]

    triage = rule_based_triage(features)
    cluster = get_cluster_from_db(user_id)

    # Delete any previous full_pipeline row, then insert fresh
    client.table("ml_results").delete().eq("user_id", user_id).eq("model_type", "full_pipeline").execute()
    client.table("ml_results").insert(
        {
            "user_id": user_id,
            "model_type": "full_pipeline",
            "result": {
                "anomaly": anomaly,
                "triage": triage,
                "cluster": cluster,
                "features_date": row_date,
                "computed_at": datetime.now(timezone.utc).isoformat(),
            },
        }
    ).execute()

    print(f"  user={user_id[:8]}...  date={row_date}")
    print(f"    nocturnal_pattern={triage['nocturnal_pattern']:.3f}  "
          f"attention_fragmentation={triage['attention_fragmentation']:.3f}  "
          f"doomscrolling={triage['doomscrolling']:.3f}")
    print(f"    anomaly={anomaly['is_anomaly']}  risk={anomaly['risk_level']}  "
          f"cluster={cluster['cluster_name']}")
    return {"status": "ok", "user_id": user_id, "date": row_date}


def run_survey_only_user(user_id: str) -> dict:
    """Run triage for users who have surveys but no daily_features — uses neutral behavioral defaults."""
    phq9, gad7 = get_latest_surveys(user_id)
    if phq9 == 0.0 and gad7 == 0.0:
        return {"status": "skipped", "reason": "no_survey_data"}

    # Neutral behavioral defaults — only survey signals are meaningful
    features = map_features({}, phq9, gad7)
    anomaly = rule_based_anomaly(features)
    features["anomaly_score"] = anomaly["anomaly_score"]
    triage = rule_based_triage(features)
    cluster = get_cluster_from_db(user_id)

    client.table("ml_results").delete().eq("user_id", user_id).eq("model_type", "full_pipeline").execute()
    client.table("ml_results").insert(
        {
            "user_id": user_id,
            "model_type": "full_pipeline",
            "result": {
                "anomaly": anomaly,
                "triage": triage,
                "cluster": cluster,
                "features_date": None,
                "computed_at": datetime.now(timezone.utc).isoformat(),
            },
        }
    ).execute()

    print(f"  user={user_id[:8]}...  (survey-only)")
    print(f"    low_mood={triage['low_mood_indicator']:.3f}  anxiety={triage['anxiety_indicator']:.3f}  phq9={phq9}")
    print(f"    cluster={cluster['cluster_name']}")
    return {"status": "ok", "user_id": user_id, "date": "survey-only"}


def main() -> None:
    print("Fetching all users with daily_features...")
    feat_resp = client.table("daily_features").select("user_id").execute()
    feat_user_ids = list({r["user_id"] for r in (feat_resp.data or [])})
    print(f"Found {len(feat_user_ids)} users with daily_features\n")

    results = []
    for uid in feat_user_ids:
        print(f"Running full inference for {uid[:8]}...")
        r = run_for_user(uid)
        results.append(r)
        print()

    # Also process users with surveys but no daily_features
    survey_resp = client.table("survey_responses").select("user_id").execute()
    survey_user_ids = list({r["user_id"] for r in (survey_resp.data or [])})
    survey_only = [u for u in survey_user_ids if u not in feat_user_ids]

    if survey_only:
        print(f"Found {len(survey_only)} users with surveys but no daily_features")
        for uid in survey_only:
            print(f"Running survey-only inference for {uid[:8]}...")
            r = run_survey_only_user(uid)
            results.append(r)
            print()

    ok = sum(1 for r in results if r.get("status") == "ok")
    print(f"Done. {ok}/{len(results)} users updated with full_pipeline results.")


if __name__ == "__main__":
    main()
