"""
train_all.py — Bootstrap training script.

Runs the full training pipeline from scratch:
  1. Generate synthetic data (or load from data/synthetic/)
  2. Train all global models (IF, XGBoost, KMeans)
  3. Verify models load correctly
  4. Print status report

Usage:
  python -m ml_worker.utils.train_all
  python -m ml_worker.utils.train_all --csv data/synthetic/synthetic_10000.csv
  python -m ml_worker.utils.train_all --force   # retrain even if models exist
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Kairós global model trainer")
    parser.add_argument("--csv", type=str, default=None, help="Path to training CSV")
    parser.add_argument("--force", action="store_true", help="Force retrain even if models exist")
    parser.add_argument("--samples", type=int, default=10000, help="Synthetic sample count")
    args = parser.parse_args()

    import pandas as pd
    from ml_worker.pipelines.cold_start import ensure_global_models, _generate_synthetic_features
    from ml_worker.models.anomaly import load_isolation_forest
    from ml_worker.models.scoring import load_xgboost
    from ml_worker.models.clustering import load_kmeans

    if args.csv:
        csv_path = Path(args.csv)
        if not csv_path.exists():
            logger.error("CSV not found: %s", csv_path)
            sys.exit(1)
        logger.info("Loading training data from %s", csv_path)
        df = pd.read_csv(csv_path)
    else:
        logger.info("Generating %d synthetic training samples...", args.samples)
        from data.scripts.download_datasets import generate_synthetic
        df = generate_synthetic(args.samples)

    logger.info("Training dataset: %d rows × %d cols", len(df), len(df.columns))

    # Train all global models
    from ml_worker.models.anomaly import train_isolation_forest
    from ml_worker.models.scoring import train_xgboost
    from ml_worker.models.clustering import train_kmeans

    results = {}

    logger.info("Training Isolation Forest...")
    try:
        train_isolation_forest(df, user_id=None)
        results["isolation_forest"] = "✓"
    except Exception as e:
        results["isolation_forest"] = f"✗ {e}"

    logger.info("Training XGBoost MultiOutputRegressor...")
    try:
        train_xgboost(df, user_id=None)
        results["xgboost"] = "✓"
    except Exception as e:
        results["xgboost"] = f"✗ {e}"

    logger.info("Training K-Means...")
    try:
        train_kmeans(df)
        results["kmeans"] = "✓"
    except Exception as e:
        results["kmeans"] = f"✗ {e}"

    # Verify all load correctly
    logger.info("\nVerification:")
    results["IF_loadable"] = "✓" if load_isolation_forest(None) else "✗ file missing"
    results["XGB_loadable"] = "✓" if load_xgboost(None) else "✗ file missing"
    results["KMeans_loadable"] = "✓" if load_kmeans() else "✗ file missing"

    # Test inference on a dummy row
    test_row = {
        "total_usage_min": 300, "nocturnal_min": 60, "nocturnal_ratio": 0.2,
        "social_ratio": 0.4, "productive_ratio": 0.2, "avg_scroll_speed": 900,
        "session_count": 15, "max_session_min": 45, "app_switches_per_hour": 8,
        "notification_count": 40, "phq9_score": 8, "gad7_score": 6,
        "anomaly_score": 0.3, "streak_adherence_rate": 0.7,
    }
    from ml_worker.models.anomaly import predict_anomaly
    from ml_worker.models.scoring import predict_triage_scores
    from ml_worker.models.clustering import predict_cluster

    try:
        anomaly = predict_anomaly(test_row)
        triage = predict_triage_scores(test_row)
        cluster = predict_cluster(test_row)
        results["inference_test"] = "✓"
        logger.info("\nSample inference on test row:")
        logger.info("  anomaly: %s", anomaly)
        logger.info("  triage:  %s", triage)
        logger.info("  cluster: %s", cluster)
    except Exception as e:
        results["inference_test"] = f"✗ {e}"

    # Summary
    print("\n" + "=" * 50)
    print("TRAINING RESULTS")
    print("=" * 50)
    for k, v in results.items():
        print(f"  {k:30s} {v}")
    print("=" * 50)

    failed = [k for k, v in results.items() if v.startswith("✗")]
    if failed:
        logger.error("Some steps failed: %s", failed)
        sys.exit(1)
    else:
        logger.info("All models trained and verified.")


if __name__ == "__main__":
    main()
