"""
Bootstrap runner — ejecutar desde ml-worker/:
  python run_bootstrap.py [--force] [--samples N]

The directory is named 'ml-worker' (hyphen) which Python can't import.
We register 'ml_worker' in sys.modules pointing to this directory so all
internal 'from ml_worker.X import Y' statements resolve correctly.
"""
import sys, os, types

_HERE = os.path.dirname(os.path.abspath(__file__))

# Register 'ml_worker' package alias → this directory
_pkg = types.ModuleType("ml_worker")
_pkg.__path__ = [_HERE]
_pkg.__package__ = "ml_worker"
_pkg.__spec__ = None
sys.modules["ml_worker"] = _pkg

# Also add current dir so relative imports work
sys.path.insert(0, _HERE)

# Load .env before any ml_worker import
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--samples", type=int, default=10000)
    args = parser.parse_args()

    import logging
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    # Import AFTER path + alias setup
    from ml_worker.pipelines.cold_start import ensure_global_models, _generate_synthetic_features
    from ml_worker.models.anomaly import train_isolation_forest
    from ml_worker.models.scoring import train_xgboost
    from ml_worker.models.clustering import train_kmeans
    from ml_worker.models.anomaly import load_isolation_forest
    from ml_worker.models.scoring import load_xgboost
    from ml_worker.models.clustering import load_kmeans

    print(f"\nGenerating {args.samples} synthetic training samples...")
    df = _generate_synthetic_features(n_users=args.samples // 60 or 100, n_days=60)
    print(f"Generated {len(df)} rows\n")

    results = {}
    for name, fn in [
        ("isolation_forest", lambda: train_isolation_forest(df, user_id=None)),
        ("xgboost", lambda: train_xgboost(df, user_id=None)),
        ("kmeans", lambda: train_kmeans(df)),
    ]:
        try:
            fn()
            results[name] = "✓ trained"
        except Exception as e:
            results[name] = f"✗ {e}"

    results["IF_loadable"] = "✓" if load_isolation_forest(None) else "✗"
    results["XGB_loadable"] = "✓" if load_xgboost(None) else "✗"
    results["KMeans_loadable"] = "✓" if load_kmeans() else "✗"

    # Inference smoke test
    test_row = {
        "total_usage_min": 300, "nocturnal_min": 60, "nocturnal_ratio": 0.2,
        "social_ratio": 0.4, "productive_ratio": 0.2, "avg_scroll_speed": 900,
        "session_count": 15, "max_session_min": 45, "app_switches_per_hour": 8,
        "notification_count": 40, "phq9_score": 8, "gad7_score": 6,
        "app_switches": 12, "scroll_distance_km": 0.3,
        "anomaly_score": 0.3, "streak_adherence_rate": 0.7,
    }
    from ml_worker.models.anomaly import predict_anomaly
    from ml_worker.models.scoring import predict_triage_scores
    from ml_worker.models.clustering import predict_cluster

    try:
        a = predict_anomaly(test_row)
        t = predict_triage_scores(test_row)
        c = predict_cluster(test_row)
        print(f"\nSample inference:")
        print(f"  anomaly : {a}")
        print(f"  triage  : {t}")
        print(f"  cluster : {c}")
        results["inference_smoke_test"] = "✓"
    except Exception as e:
        results["inference_smoke_test"] = f"✗ {e}"

    import io, sys as _sys
    _out = io.TextIOWrapper(_sys.stdout.buffer, encoding="utf-8", errors="replace")
    _out.write("\n" + "=" * 50 + "\n")
    for k, v in results.items():
        _out.write(f"  {k:30s} {v}\n")
    _out.write("=" * 50 + "\n")
    _out.flush()
    failed = [k for k, v in results.items() if str(v).startswith("✗")]
    sys.exit(1 if failed else 0)
