from database import supabase


def get_ml_scores(user_id: str) -> dict:
    """Read latest ML pipeline results for a user from ml_results.

    Tries full_pipeline first (written by Celery / run_inference_now.py).
    Falls back to combining individual model results when full_pipeline absent.
    Cold-start safe: returns neutral zeros when no results exist.
    """
    resp = (
        supabase.table("ml_results")
        .select("result,computed_at")
        .eq("user_id", user_id)
        .eq("model_type", "full_pipeline")
        .order("computed_at", desc=True)
        .limit(1)
        .execute()
    )

    if resp.data:
        return _parse_full_pipeline(resp.data[0].get("result", {}))

    return _read_individual_models(user_id)


def _parse_full_pipeline(result: dict) -> dict:
    triage = result.get("triage", {})
    anomaly = result.get("anomaly", {})
    cluster = result.get("cluster", {})
    return {
        "attention_fragmentation_score": float(triage.get("attention_fragmentation", 0.0)),
        "nocturnal_pattern_score": float(triage.get("nocturnal_pattern", 0.0)),
        "doomscrolling_score": float(triage.get("doomscrolling", 0.0)),
        "low_mood_score": float(triage.get("low_mood_indicator", 0.0)),
        "anxiety_score": float(triage.get("anxiety_indicator", 0.0)),
        "anomaly_flag": bool(anomaly.get("is_anomaly", False)),
        "anomaly_severity": float(anomaly.get("anomaly_score", 0.0)),
        "anomaly_risk_level": anomaly.get("risk_level", "low"),
        "flagged_features": anomaly.get("flagged_features", []),
        "cluster_name": cluster.get("cluster_name", "unknown"),
        "cluster_label": int(cluster.get("cluster_label", -1)),
        "model_source": triage.get("model", "full_pipeline"),
        "has_ml_data": True,
    }


def _read_individual_models(user_id: str) -> dict:
    """Fallback: combine isolation_forest + xgboost_mood + kmeans_cluster rows."""
    resp = (
        supabase.table("ml_results")
        .select("model_type,result")
        .eq("user_id", user_id)
        .in_("model_type", ["isolation_forest", "xgboost_mood", "kmeans_cluster", "attention_fragmentation"])
        .order("computed_at", desc=True)
        .execute()
    )
    if not resp.data:
        return _neutral()

    by_type: dict[str, dict] = {}
    for row in resp.data:
        mt = row["model_type"]
        if mt not in by_type:
            r = row["result"]
            by_type[mt] = r if isinstance(r, dict) else {}

    iso = by_type.get("isolation_forest", {})
    xgb = by_type.get("xgboost_mood", {})
    cluster_r = by_type.get("kmeans_cluster", {})

    # xgboost_mood stores direction/confidence — derive mood score from it
    xgb_change = float(xgb.get("predicted_phq9_change", 0.0))
    low_mood = min(abs(xgb_change) / 5.0, 1.0) if xgb_change > 0 else 0.0

    return {
        "attention_fragmentation_score": float(by_type.get("attention_fragmentation", {}).get("score", 0.0)),
        "nocturnal_pattern_score": 0.0,
        "doomscrolling_score": 0.0,
        "low_mood_score": low_mood,
        "anxiety_score": 0.0,
        "anomaly_flag": bool(iso.get("is_anomaly", False)),
        "anomaly_severity": float(iso.get("anomaly_score", 0.0)),
        "anomaly_risk_level": iso.get("risk_level", "low"),
        "flagged_features": iso.get("flagged_features", []),
        "cluster_name": cluster_r.get("profile", cluster_r.get("cluster_name", "unknown")),
        "cluster_label": int(cluster_r.get("cluster", cluster_r.get("cluster_label", -1))),
        "model_source": "individual_models",
        "has_ml_data": bool(by_type),
    }


def _neutral() -> dict:
    return {
        "attention_fragmentation_score": 0.0,
        "nocturnal_pattern_score": 0.0,
        "doomscrolling_score": 0.0,
        "low_mood_score": 0.0,
        "anxiety_score": 0.0,
        "anomaly_flag": False,
        "anomaly_severity": 0.0,
        "anomaly_risk_level": "low",
        "flagged_features": [],
        "cluster_name": "unknown",
        "cluster_label": -1,
        "model_source": "none",
        "has_ml_data": False,
    }
