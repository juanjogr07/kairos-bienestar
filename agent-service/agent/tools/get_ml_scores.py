from database import supabase
from typing import Optional


def get_ml_scores(user_id: str) -> dict:
    def latest_result(model_type: str) -> Optional[dict]:
        res = (
            supabase.table("ml_results")
            .select("result")
            .eq("user_id", user_id)
            .eq("model_type", model_type)
            .order("computed_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0]["result"] if res.data else None

    xgb = latest_result("xgboost_mood")
    iso = latest_result("isolation_forest")

    return {
        "attention_fragmentation_score": xgb.get("attention_fragmentation_score", 0.0) if xgb else 0.0,
        "nocturnal_pattern_score": xgb.get("nocturnal_pattern_score", 0.0) if xgb else 0.0,
        "doomscrolling_score": xgb.get("doomscrolling_score", 0.0) if xgb else 0.0,
        "anomaly_flag": iso.get("is_anomaly", False) if iso else False,
        "anomaly_severity": abs(iso.get("anomaly_score", 0.0)) if iso else 0.0,
        "has_ml_data": xgb is not None,
    }
