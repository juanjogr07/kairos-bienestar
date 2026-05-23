"""
Modelo 4 — Prophet Forecaster  (Fase 2)

Predice usage + mood_proxy para los próximos 7 días.
Detecta tendencias de recaída: si PHQ-9 proxy crece 20%+ en 7d → alerta.

Output: forecast_7d (list of daily predictions), trend_direction, relapse_risk_score
"""
from __future__ import annotations

import os
import joblib
import warnings
from typing import Any

import numpy as np
import pandas as pd

from ml_worker.config import MODELS_DIR, FORECAST_MIN_DAYS

warnings.filterwarnings("ignore", message=".*Importing plotly.*")
warnings.filterwarnings("ignore", message=".*Disabling weekly seasonality.*")

try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False


def _model_path(user_id: str, target: str) -> str:
    return os.path.join(MODELS_DIR, f"prophet_{target}_{user_id}.joblib")


def train_prophet(df: pd.DataFrame, user_id: str, target_col: str = "total_usage_min") -> Any | None:
    """Train Prophet on a user's daily time series.

    df must have 'date' (datetime) and target_col columns.
    Requires at least FORECAST_MIN_DAYS rows.
    Returns None if not enough data or Prophet unavailable.
    """
    if not PROPHET_AVAILABLE:
        return None
    if len(df) < FORECAST_MIN_DAYS:
        return None

    prophet_df = df[["date", target_col]].rename(columns={"date": "ds", target_col: "y"}).copy()
    prophet_df["ds"] = pd.to_datetime(prophet_df["ds"])
    prophet_df["y"] = pd.to_numeric(prophet_df["y"], errors="coerce").fillna(0)

    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=True,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
    )
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model.fit(prophet_df)

    joblib.dump(model, _model_path(user_id, target_col))
    return model


def load_prophet(user_id: str, target_col: str = "total_usage_min") -> Any | None:
    mp = _model_path(user_id, target_col)
    if not os.path.exists(mp):
        return None
    return joblib.load(mp)


def predict_forecast(user_id: str, target_col: str = "total_usage_min", horizon_days: int = 7) -> dict:
    """Forecast next N days for a user.

    Returns: {forecast_7d, trend_direction, relapse_risk_score, model}
    """
    model = load_prophet(user_id, target_col)
    if model is None or not PROPHET_AVAILABLE:
        return _flat_forecast(horizon_days)

    future = model.make_future_dataframe(periods=horizon_days)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        forecast = model.predict(future)

    last_n = forecast.tail(horizon_days)
    yhat = last_n["yhat"].clip(lower=0).tolist()

    # trend: compare first vs last 3 days of forecast window
    if len(yhat) >= 6:
        first_half = np.mean(yhat[:3])
        second_half = np.mean(yhat[-3:])
        pct_change = (second_half - first_half) / (first_half + 1e-8)
    else:
        pct_change = 0.0

    trend = "increasing" if pct_change > 0.05 else ("decreasing" if pct_change < -0.05 else "stable")

    # relapse risk: 20%+ increase in usage/mood proxy over horizon
    relapse_risk = float(np.clip(pct_change, 0, 1)) if pct_change > 0.2 else 0.0

    return {
        "forecast_7d": [round(v, 1) for v in yhat],
        "trend_direction": trend,
        "relapse_risk_score": round(relapse_risk, 4),
        "pct_change": round(float(pct_change), 4),
        "model": "prophet",
    }


def _flat_forecast(horizon_days: int) -> dict:
    """Fallback when no model available."""
    return {
        "forecast_7d": [0.0] * horizon_days,
        "trend_direction": "unknown",
        "relapse_risk_score": 0.0,
        "pct_change": 0.0,
        "model": "none",
    }
