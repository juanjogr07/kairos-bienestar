from database import supabase


def get_anomaly_flags(user_id: str, days: int = 7) -> dict:
    """Return anomaly flags for the last N days for a user.

    Reads from ml_results table. Used by orchestrator to provide
    context about unusual usage days to the LLM.
    """
    resp = (
        supabase.table("ml_results")
        .select("date,result")
        .eq("user_id", user_id)
        .eq("model_type", "full_pipeline")
        .order("date", desc=True)
        .limit(days)
        .execute()
    )

    rows = resp.data or []
    anomalous_days = []
    for row in rows:
        anomaly = row.get("result", {}).get("anomaly", {})
        if anomaly.get("is_anomaly"):
            anomalous_days.append({
                "date": row["date"],
                "anomaly_score": round(float(anomaly.get("anomaly_score", 0)), 3),
                "risk_level": anomaly.get("risk_level", "low"),
                "flagged_features": anomaly.get("flagged_features", []),
            })

    latest_anomaly = rows[0].get("result", {}).get("anomaly", {}) if rows else {}

    return {
        "anomalous_days_count": len(anomalous_days),
        "anomalous_days": anomalous_days,
        "latest_anomaly_score": float(latest_anomaly.get("anomaly_score", 0.0)),
        "latest_is_anomaly": bool(latest_anomaly.get("is_anomaly", False)),
        "latest_risk_level": latest_anomaly.get("risk_level", "low"),
        "days_checked": len(rows),
    }
