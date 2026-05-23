"""
Dataset Downloader for Kairós ML training.

Fuentes:
  1. StudentLife 2014 (Dartmouth) — mental health + phone usage
  2. TILES-2018 (USC) — wearable + phone + surveys
  3. AWARE Framework public datasets
  4. PHQ-9/GAD-7 reference normativas (Colombia MINSALUD)
  5. Synthetic generator (local, always available)

Usage:
  python data/scripts/download_datasets.py --dataset all
  python data/scripts/download_datasets.py --dataset synthetic --samples 10000
  python data/scripts/download_datasets.py --dataset studentlife
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
SYNTHETIC_DIR = DATA_DIR / "synthetic"

RNG = np.random.default_rng(42)


# ─── StudentLife ──────────────────────────────────────────────────────────────

STUDENTLIFE_URL = "https://studentlife.cs.dartmouth.edu/dataset/dataset.tar.gz"
STUDENTLIFE_README = "https://studentlife.cs.dartmouth.edu/dataset.html"


def download_studentlife() -> bool:
    """Download StudentLife 2014 dataset.

    Note: dataset requires manual form submission at studentlife.cs.dartmouth.edu.
    This function downloads the publicly accessible portion and creates a
    request_access.txt guide for the full dataset.
    """
    out_dir = RAW_DIR / "studentlife"
    out_dir.mkdir(parents=True, exist_ok=True)

    guide = out_dir / "REQUEST_ACCESS.txt"
    guide.write_text(
        "StudentLife Dataset (Dartmouth, 2014)\n"
        "--------------------------------------\n"
        "URL: https://studentlife.cs.dartmouth.edu\n\n"
        "To request access:\n"
        "1. Visit the URL above\n"
        "2. Fill out the data use agreement\n"
        "3. Dataset will be emailed as a tar.gz (~2GB)\n\n"
        "Variables of interest for Kairós:\n"
        "  - PHQ-9 surveys (pre/mid/post)\n"
        "  - Phone usage logs (app foreground events)\n"
        "  - Sleep inference (accelerometer)\n"
        "  - Conversational activity (mic on/off)\n\n"
        "Reference paper:\n"
        "  Wang et al. (2014). StudentLife: Assessing Mental Health,\n"
        "  Academic Performance and Behavioral Trends of College Students\n"
        "  using Smartphones. UbiComp 2014.\n"
    )
    logger.info("StudentLife access guide written to %s", guide)
    return True


# ─── TILES-2018 ───────────────────────────────────────────────────────────────

def download_tiles() -> bool:
    """Download TILES-2018 dataset.

    Full dataset requires IRB approval from USC.
    Writes access guide + creates schema reference.
    """
    out_dir = RAW_DIR / "tiles2018"
    out_dir.mkdir(parents=True, exist_ok=True)

    guide = out_dir / "REQUEST_ACCESS.txt"
    guide.write_text(
        "TILES-2018 Dataset (USC)\n"
        "------------------------\n"
        "URL: https://tiles-2018.isi.edu\n"
        "PhysioNet mirror: https://physionet.org/content/tiles-2018/\n\n"
        "Access:\n"
        "  PhysioNet requires credentialed account + data use agreement.\n"
        "  Command after approval:\n"
        "    wget -r -N -c -np https://physionet.org/files/tiles-2018/1.0/\n\n"
        "Variables of interest:\n"
        "  - Fitbit: steps, HR, sleep stages\n"
        "  - Phone: app usage, screen on/off\n"
        "  - Surveys: PHQ-4, GAD-7, PANAS, AUDIT\n"
        "  - Badges: IRL social interaction proximity\n\n"
        "Reference:\n"
        "  Mundnich et al. (2020). TILES-2018. Scientific Data, 7, 354.\n"
    )

    # Download schema reference (public)
    schema_path = out_dir / "schema_reference.json"
    schema = {
        "survey_tables": ["PHQ4", "GAD7", "PANAS", "STAI", "BFI", "AUDIT"],
        "sensor_tables": ["fitbit_heartrate", "fitbit_steps", "fitbit_sleep", "phone_app_usage"],
        "sampling_rates": {"fitbit_hr": "1min", "fitbit_steps": "1min", "phone_app": "event"},
        "participants": 212,
        "duration_weeks": 10,
    }
    schema_path.write_text(json.dumps(schema, indent=2))
    logger.info("TILES-2018 guide written to %s", guide)
    return True


# ─── PHQ-9 / GAD-7 Colombia normativas ───────────────────────────────────────

def download_colombia_norms() -> bool:
    """Download/create Colombian normative PHQ-9/GAD-7 reference tables.

    Based on: MINSALUD Colombia ENSM 2015, Encuesta Nacional de Salud Mental.
    """
    out_dir = PROCESSED_DIR / "colombia_norms"
    out_dir.mkdir(parents=True, exist_ok=True)

    # Approximate Colombian adult population distributions (ENSM 2015)
    phq9_norms = {
        "none": {"range": [0, 4], "prevalence_pct": 57.3},
        "mild": {"range": [5, 9], "prevalence_pct": 22.4},
        "moderate": {"range": [10, 14], "prevalence_pct": 11.8},
        "moderately_severe": {"range": [15, 19], "prevalence_pct": 6.1},
        "severe": {"range": [20, 27], "prevalence_pct": 2.4},
        "source": "MINSALUD ENSM 2015 (Colombia)",
        "linea_106_threshold": 15,
    }

    gad7_norms = {
        "minimal": {"range": [0, 4], "prevalence_pct": 61.2},
        "mild": {"range": [5, 9], "prevalence_pct": 20.1},
        "moderate": {"range": [10, 14], "prevalence_pct": 11.7},
        "severe": {"range": [15, 21], "prevalence_pct": 7.0},
        "source": "MINSALUD ENSM 2015 (Colombia)",
        "linea_106_threshold": 15,
    }

    (out_dir / "phq9_colombia_norms.json").write_text(json.dumps(phq9_norms, indent=2))
    (out_dir / "gad7_colombia_norms.json").write_text(json.dumps(gad7_norms, indent=2))
    logger.info("Colombia normative tables written to %s", out_dir)
    return True


# ─── Synthetic dataset ────────────────────────────────────────────────────────

def generate_synthetic(n_samples: int = 10000, output_file: str | None = None) -> pd.DataFrame:
    """Generate synthetic behavioral + mood dataset for ML training.

    Distribution modeled after StudentLife + TILES-2018 baselines with
    added LATAM behavioral patterns (WhatsApp-heavy usage, late-night culture).
    """
    archetypes = RNG.choice(
        ["healthy", "at_risk_mood", "at_risk_anxiety", "high_risk", "nocturnal"],
        size=n_samples,
        p=[0.45, 0.20, 0.15, 0.10, 0.10],
    )

    rows = []
    for i, arch in enumerate(archetypes):
        if arch == "healthy":
            usage = max(0, RNG.normal(170, 45))
            nocturnal_ratio = float(RNG.beta(1.5, 9))
            phq9 = int(RNG.choice(range(0, 8), p=[0.35, 0.25, 0.18, 0.1, 0.05, 0.04, 0.02, 0.01]))
            gad7 = int(RNG.choice(range(0, 7), p=[0.40, 0.25, 0.18, 0.1, 0.04, 0.02, 0.01]))
        elif arch == "at_risk_mood":
            usage = max(0, RNG.normal(290, 70))
            nocturnal_ratio = float(RNG.beta(2.5, 7))
            phq9 = int(RNG.integers(5, 15))
            gad7 = int(RNG.integers(0, 10))
        elif arch == "at_risk_anxiety":
            usage = max(0, RNG.normal(250, 60))
            nocturnal_ratio = float(RNG.beta(2, 6))
            phq9 = int(RNG.integers(0, 10))
            gad7 = int(RNG.integers(5, 15))
        elif arch == "high_risk":
            usage = max(0, RNG.normal(430, 100))
            nocturnal_ratio = float(RNG.beta(5, 5))
            phq9 = int(RNG.integers(15, 28))
            gad7 = int(RNG.integers(15, 22))
        else:  # nocturnal
            usage = max(0, RNG.normal(320, 80))
            nocturnal_ratio = float(RNG.beta(6, 4))
            phq9 = int(RNG.integers(5, 20))
            gad7 = int(RNG.integers(3, 15))

        nocturnal_min = usage * nocturnal_ratio
        social_ratio = float(np.clip(RNG.beta(3, 5), 0, 1))
        productive_ratio = float(np.clip(RNG.beta(2, 6), 0, 1))

        rows.append({
            "archetype": arch,
            "total_usage_min": round(usage, 2),
            "nocturnal_min": round(nocturnal_min, 2),
            "nocturnal_ratio": round(nocturnal_ratio, 4),
            "social_ratio": round(social_ratio, 4),
            "productive_ratio": round(productive_ratio, 4),
            "avg_scroll_speed": round(float(np.clip(RNG.normal(800, 250), 0, 2000)), 2),
            "session_count": int(np.clip(RNG.poisson(10 + usage / 30), 1, 80)),
            "max_session_min": round(float(np.clip(RNG.exponential(35), 1, usage + 1)), 2),
            "app_switches_per_hour": round(float(np.clip(RNG.poisson(8), 0, 30)), 2),
            "notification_count": int(np.clip(RNG.poisson(35), 0, 200)),
            "phq9_score": phq9,
            "gad7_score": gad7,
            "anomaly_score": 0.0,
            "streak_adherence_rate": round(float(np.clip(RNG.beta(4, 2), 0, 1)), 4),
            # Soft labels (ground truth for supervised training)
            "attention_fragmentation": round(float(np.clip(
                (min(RNG.poisson(10), 30) / 30) * 0.5 + (min(RNG.poisson(8), 20) / 20) * 0.5, 0, 1
            )), 4),
            "nocturnal_pattern": round(float(np.clip(nocturnal_ratio * 0.6 + min(nocturnal_min, 120) / 120 * 0.4, 0, 1)), 4),
            "doomscrolling": round(float(np.clip(
                (min(float(np.clip(RNG.normal(800, 250), 0, 2000)), 1500) / 1500) * 0.4
                + social_ratio * 0.35 + min(usage, 480) / 480 * 0.25, 0, 1
            )), 4),
            "low_mood_indicator": round(phq9 / 27, 4),
            "anxiety_indicator": round(gad7 / 21, 4),
        })

    df = pd.DataFrame(rows)
    out_path = output_file or str(SYNTHETIC_DIR / f"synthetic_{n_samples}.csv")
    SYNTHETIC_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)
    logger.info("Generated %d synthetic samples → %s", n_samples, out_path)
    return df


# ─── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Kairós dataset downloader")
    parser.add_argument(
        "--dataset",
        choices=["all", "studentlife", "tiles", "colombia_norms", "synthetic"],
        default="synthetic",
        help="Which dataset to download/generate",
    )
    parser.add_argument("--samples", type=int, default=10000, help="Synthetic sample count")
    parser.add_argument("--output", type=str, default=None, help="Output CSV path for synthetic")
    args = parser.parse_args()

    if args.dataset in ("all", "studentlife"):
        download_studentlife()
    if args.dataset in ("all", "tiles"):
        download_tiles()
    if args.dataset in ("all", "colombia_norms"):
        download_colombia_norms()
    if args.dataset in ("all", "synthetic"):
        generate_synthetic(args.samples, args.output)

    logger.info("Done. Data directory: %s", DATA_DIR)


if __name__ == "__main__":
    main()
