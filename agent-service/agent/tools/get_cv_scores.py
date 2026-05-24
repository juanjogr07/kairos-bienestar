"""
Tool: get_cv_scores

Fetches the latest CV scores (posture, eye strain, environment) from Supabase.
Returns neutral values if no CV data exists for the user.
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

NEUTRAL = {
    "cv_available": False,
    "physical_wellness_score": 0.5,
    "digital_context_score": 0.5,
    "distraction_risk_score": 0.0,
    "posture_score": 0.5,
    "eye_strain_score": 0.0,
    "blink_rate_rpm": 15.0,
    "environment_context": "unknown",
}


def get_cv_scores(user_id: str) -> dict:
    try:
        from supabase import create_client
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        sb = create_client(url, key)

        res = (
            sb.table("cv_scores")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not res.data:
            return NEUTRAL

        row = res.data[0]
        return {
            "cv_available": True,
            "physical_wellness_score": float(row.get("physical_wellness_score", 0.5)),
            "digital_context_score": float(row.get("digital_context_score", 0.5)),
            "distraction_risk_score": float(row.get("distraction_risk_score", 0.0)),
            "posture_score": float(row.get("posture_score", 0.5)),
            "eye_strain_score": float(row.get("eye_strain_score", 0.0)),
            "blink_rate_rpm": float(row.get("blink_rate_rpm", 15.0)),
            "environment_context": row.get("environment_context", "unknown"),
        }
    except Exception as exc:
        logger.warning("get_cv_scores failed: %s", exc)
        return NEUTRAL
