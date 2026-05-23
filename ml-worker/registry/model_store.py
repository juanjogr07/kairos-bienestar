"""
Model Registry — decides which model variant to use at inference time.

Personal model: preferred if user has ≥ PERSONALIZATION_MIN_DAYS of data and file exists.
Global model: fallback for cold-start users.
Rule-based: last resort when no models are trained.
"""
from __future__ import annotations

import os
import logging
from dataclasses import dataclass
from enum import Enum

from ml_worker.config import (
    MODELS_DIR,
    PERSONALIZATION_MIN_DAYS,
    LSTM_PERSONALIZATION_MIN_DAYS,
)

logger = logging.getLogger(__name__)


class ModelTier(str, Enum):
    PERSONAL = "personal"
    GLOBAL = "global"
    RULE_BASED = "rule_based"


@dataclass
class ModelInfo:
    tier: ModelTier
    path: str | None
    user_id: str | None


def _exists(path: str) -> bool:
    return os.path.exists(path)


def _personal_path(prefix: str, user_id: str) -> str:
    return os.path.join(MODELS_DIR, f"{prefix}_{user_id}.joblib")


def _global_path(prefix: str) -> str:
    return os.path.join(MODELS_DIR, f"{prefix}_global.joblib")


def resolve_isolation_forest(user_id: str, data_days: int = 0) -> ModelInfo:
    """Resolve which Isolation Forest model to use for this user."""
    if data_days >= PERSONALIZATION_MIN_DAYS:
        pp = _personal_path("if", user_id)
        if _exists(pp):
            return ModelInfo(ModelTier.PERSONAL, pp, user_id)

    gp = _global_path("if")
    if _exists(gp):
        return ModelInfo(ModelTier.GLOBAL, gp, None)

    return ModelInfo(ModelTier.RULE_BASED, None, None)


def resolve_xgboost(user_id: str, data_days: int = 0) -> ModelInfo:
    """Resolve which XGBoost triage scorer to use."""
    if data_days >= PERSONALIZATION_MIN_DAYS:
        pp = _personal_path("xgb", user_id)
        if _exists(pp):
            return ModelInfo(ModelTier.PERSONAL, pp, user_id)

    gp = _global_path("xgb")
    if _exists(gp):
        return ModelInfo(ModelTier.GLOBAL, gp, None)

    return ModelInfo(ModelTier.RULE_BASED, None, None)


def resolve_kmeans() -> ModelInfo:
    """K-Means is always global (no personalization)."""
    gp = _global_path("kmeans")
    if _exists(gp):
        return ModelInfo(ModelTier.GLOBAL, gp, None)
    return ModelInfo(ModelTier.RULE_BASED, None, None)


def resolve_prophet(user_id: str, data_days: int = 0, target: str = "total_usage_min") -> ModelInfo:
    """Prophet is personal-only (needs 30+ days; falls back to flat forecast)."""
    if data_days >= PERSONALIZATION_MIN_DAYS:
        pp = os.path.join(MODELS_DIR, f"prophet_{target}_{user_id}.joblib")
        if _exists(pp):
            return ModelInfo(ModelTier.PERSONAL, pp, user_id)
    return ModelInfo(ModelTier.RULE_BASED, None, None)


def get_data_day_count(user_id: str) -> int:
    """Count how many daily feature rows exist for a user in the DB.

    Reads from Supabase. Returns 0 on failure (safe cold-start).
    """
    try:
        from supabase import create_client
        from ml_worker.config import SUPABASE_URL, SUPABASE_SERVICE_KEY
        client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        resp = (
            client.table("daily_features")
            .select("date", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        return resp.count or 0
    except Exception as e:
        logger.warning("Could not count data days for %s: %s", user_id, e)
        return 0


def full_model_status(user_id: str) -> dict:
    """Return a summary of which model tier each model will use for this user."""
    days = get_data_day_count(user_id)
    return {
        "user_id": user_id,
        "data_days": days,
        "isolation_forest": resolve_isolation_forest(user_id, days).tier.value,
        "xgboost": resolve_xgboost(user_id, days).tier.value,
        "kmeans": resolve_kmeans().tier.value,
        "prophet": resolve_prophet(user_id, days).tier.value,
        "personalization_threshold": PERSONALIZATION_MIN_DAYS,
        "personalization_ready": days >= PERSONALIZATION_MIN_DAYS,
    }
