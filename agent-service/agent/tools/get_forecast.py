from database import supabase


def get_forecast(user_id: str) -> dict:
    """Return 7-day usage forecast and relapse risk for a user.

    Reads the latest forecast from ml_results where model_type='prophet_forecast'.
    Falls back to neutral when no Prophet model has been trained yet (< 30 days data).
    """
    resp = (
        supabase.table("ml_results")
        .select("result,date")
        .eq("user_id", user_id)
        .eq("model_type", "prophet_forecast")
        .order("date", desc=True)
        .limit(1)
        .execute()
    )

    if not resp.data:
        return _neutral()

    result = resp.data[0].get("result", {})
    return {
        "forecast_7d": result.get("forecast_7d", []),
        "trend_direction": result.get("trend_direction", "unknown"),
        "relapse_risk_score": float(result.get("relapse_risk_score", 0.0)),
        "pct_change": float(result.get("pct_change", 0.0)),
        "has_forecast": True,
    }


def _neutral() -> dict:
    return {
        "forecast_7d": [],
        "trend_direction": "unknown",
        "relapse_risk_score": 0.0,
        "pct_change": 0.0,
        "has_forecast": False,
    }
