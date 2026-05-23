"""
Bootstrap training pipeline — KAI-50.
Trains Isolation Forest and XGBoost Mood Predictor on synthetic data
and exports serialized models to data/models/.

Run from repo root:
    python ml-worker/bootstrap.py
"""
import sys
import os

_repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(_repo_root, "api-service"))

import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from xgboost import XGBRegressor

from services.ml.features import FEATURE_NAMES

DATA_PATH = Path("data/synthetic/mood_training.csv")
MODELS_DIR = Path("data/models")
CONTAMINATION = 0.1


def _load_data() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"{DATA_PATH} not found. Run data/synthetic/generate_seed.py first."
        )
    return pd.read_csv(DATA_PATH)


def train_isolation_forest(df: pd.DataFrame) -> dict:
    X = df[FEATURE_NAMES].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = IsolationForest(
        n_estimators=100,
        contamination=CONTAMINATION,
        random_state=42,
    )
    model.fit(X_scaled)

    scores = model.decision_function(X_scaled)
    anomalies = (scores < 0).sum()
    print(f"  Isolation Forest: {len(df)} samples, {anomalies} anomalies flagged ({anomalies/len(df)*100:.1f}%)")

    return {"model": model, "scaler": scaler}


def train_xgboost_mood(df: pd.DataFrame) -> dict:
    feature_cols = [c for c in FEATURE_NAMES if c in df.columns]
    X = df[feature_cols].values
    y = df["phq9_delta_7d"].values

    model = XGBRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        random_state=42,
        eval_metric="rmse",
        verbosity=0,
    )
    model.fit(X, y)

    preds = model.predict(X)
    rmse = float(np.sqrt(np.mean((preds - y) ** 2)))
    print(f"  XGBoost Mood: {len(df)} samples, train RMSE = {rmse:.4f}")

    return {"model": model, "feature_cols": feature_cols}


def save_artifacts(iso_artifacts: dict, xgb_artifacts: dict) -> None:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    iso_path = MODELS_DIR / "isolation_forest.joblib"
    joblib.dump({
        "model": iso_artifacts["model"],
        "scaler": iso_artifacts["scaler"],
        "feature_names": FEATURE_NAMES,
    }, iso_path)
    print(f"  Saved: {iso_path}")

    xgb_path = MODELS_DIR / "xgboost_mood.joblib"
    joblib.dump({
        "model": xgb_artifacts["model"],
        "feature_cols": xgb_artifacts["feature_cols"],
    }, xgb_path)
    print(f"  Saved: {xgb_path}")


def bootstrap() -> None:
    print("Loading training data...")
    df = _load_data()
    print(f"  Rows: {len(df)}, Columns: {list(df.columns)}\n")

    print("Training Isolation Forest...")
    iso_artifacts = train_isolation_forest(df)

    print("\nTraining XGBoost Mood Predictor...")
    xgb_artifacts = train_xgboost_mood(df)

    print("\nSaving models...")
    save_artifacts(iso_artifacts, xgb_artifacts)

    print("\nBootstrap complete.")


if __name__ == "__main__":
    bootstrap()
