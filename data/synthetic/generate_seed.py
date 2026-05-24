"""
Generate synthetic mood training data for XGBoost mood predictor.
5000 samples with LATAM behavioral archetypes.

Run from repo root:
    python data/synthetic/generate_seed.py
"""
import pandas as pd
import numpy as np

RNG = np.random.default_rng(42)
N = 5000

# LATAM archetypes — WhatsApp-heavy, late-night culture, siesta pattern
ARCHETYPES = {
    "healthy":           {"w": 0.35, "total": (120, 50),  "nocturnal": (0.05, 0.08), "social": (0.15, 0.08), "phq9_range": (0, 5),  "phq9_delta_bias": -0.3},
    "at_risk_mood":      {"w": 0.18, "total": (280, 70),  "nocturnal": (0.30, 0.15), "social": (0.35, 0.10), "phq9_range": (5, 14), "phq9_delta_bias":  1.5},
    "at_risk_anxiety":   {"w": 0.15, "total": (240, 65),  "nocturnal": (0.22, 0.12), "social": (0.28, 0.10), "phq9_range": (3, 12), "phq9_delta_bias":  0.8},
    "nocturnal_latam":   {"w": 0.12, "total": (350, 80),  "nocturnal": (0.55, 0.15), "social": (0.40, 0.12), "phq9_range": (4, 15), "phq9_delta_bias":  1.2},
    "high_risk":         {"w": 0.08, "total": (480, 100), "nocturnal": (0.60, 0.20), "social": (0.50, 0.15), "phq9_range": (15, 27),"phq9_delta_bias":  2.5},
    "doomscroller":      {"w": 0.07, "total": (400, 90),  "nocturnal": (0.45, 0.15), "social": (0.65, 0.12), "phq9_range": (5, 18), "phq9_delta_bias":  1.8},
    "productive_heavy":  {"w": 0.05, "total": (300, 60),  "nocturnal": (0.08, 0.06), "social": (0.10, 0.06), "phq9_range": (0, 7),  "phq9_delta_bias": -0.5},
}

weights = [v["w"] for v in ARCHETYPES.values()]
arch_names = list(ARCHETYPES.keys())
chosen = RNG.choice(len(arch_names), size=N, p=weights)

rows = []
for idx in chosen:
    arch = arch_names[idx]
    cfg = ARCHETYPES[arch]

    total_min = float(np.clip(RNG.normal(*cfg["total"]), 15, 900))
    nocturnal_ratio = float(np.clip(RNG.normal(*cfg["nocturnal"]), 0, 1))
    social_ratio = float(np.clip(RNG.normal(*cfg["social"]), 0, 1))
    productive_ratio = float(np.clip(RNG.normal(0.25, 0.12), 0, 1 - social_ratio))

    # WhatsApp dominates social for LATAM — high social ≠ always Instagram doomscrolling
    avg_scroll = float(np.clip(
        RNG.normal(600 + social_ratio * 400, 200),
        50, 2000
    ))
    session_count = int(np.clip(RNG.poisson(max(1, total_min / 20)), 1, 80))
    max_session = float(np.clip(RNG.exponential(30 + nocturnal_ratio * 30), 2, total_min + 1))

    phq9_lo, phq9_hi = cfg["phq9_range"]
    phq9_current = int(RNG.integers(phq9_lo, phq9_hi + 1))

    # Delta: nocturnal + social → mood worsens; productive + low total → improves
    delta_base = cfg["phq9_delta_bias"]
    delta_nocturnal = nocturnal_ratio * 2.5
    delta_social = social_ratio * 1.5 if social_ratio > 0.5 else 0
    delta_productive = -productive_ratio * 2.0
    delta_overuse = (total_min - 240) / 240 if total_min > 240 else 0
    noise = float(RNG.normal(0, 0.4))
    raw_delta = delta_base + delta_nocturnal + delta_social + delta_productive + delta_overuse + noise
    phq9_delta_7d = float(np.clip(raw_delta, -5, 5))

    rows.append({
        "archetype": arch,
        "total_minutes": round(total_min, 2),
        "nocturnal_ratio": round(nocturnal_ratio, 4),
        "social_ratio": round(social_ratio, 4),
        "avg_scroll_speed": round(avg_scroll, 2),
        "session_count": float(session_count),
        "max_session_minutes": round(max_session, 2),
        "productive_ratio": round(productive_ratio, 4),
        "phq9_current": phq9_current,
        "phq9_delta_7d": round(phq9_delta_7d, 4),
    })

df = pd.DataFrame(rows)
output_path = "data/synthetic/mood_training.csv"
df.to_csv(output_path, index=False)
print(f"Generated {len(df)} rows -> {output_path}")
print(f"\nArchetype distribution:")
print(df["archetype"].value_counts().to_string())
print(f"\nPHQ-9 delta stats:")
print(df["phq9_delta_7d"].describe().to_string())
print(f"\nFeature ranges:")
print(df[["total_minutes","nocturnal_ratio","social_ratio","avg_scroll_speed"]].describe().to_string())
