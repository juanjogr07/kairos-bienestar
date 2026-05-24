from database import supabase


def get_ml_scores(user_id: str) -> dict:
    """Read latest ML pipeline results for a user from ml_results.

    Returns field names matching what triage/tree.py and the orchestrator expect.
    Cold-start safe: returns neutral zeros when no results exist yet.
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

    if not resp.data:
        return _neutral()

    result = resp.data[0].get("result", {})
    triage = result.get("triage", {})
    anomaly = result.get("anomaly", {})
    cluster = result.get("cluster", {})

    return {
        # Triage scores — used by triage/tree.py thresholds
        "attention_fragmentation_score": float(triage.get("attention_fragmentation", 0.0)),
        "nocturnal_pattern_score": float(triage.get("nocturnal_pattern", 0.0)),
        "doomscrolling_score": float(triage.get("doomscrolling", 0.0)),
        "low_mood_score": float(triage.get("low_mood_indicator", 0.0)),
        "anxiety_score": float(triage.get("anxiety_indicator", 0.0)),
        # Anomaly — used by triage/tree.py anomaly level
        "anomaly_flag": bool(anomaly.get("is_anomaly", False)),
        "anomaly_severity": float(anomaly.get("anomaly_score", 0.0)),
        "anomaly_risk_level": anomaly.get("risk_level", "low"),
        "flagged_features": anomaly.get("flagged_features", []),
        # Cluster — context for orchestrator system prompt
        "cluster_name": cluster.get("cluster_name", "unknown"),
        "cluster_label": int(cluster.get("cluster_label", -1)),
        # Meta
        "model_source": triage.get("model", "unknown"),
        "has_ml_data": True,
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
