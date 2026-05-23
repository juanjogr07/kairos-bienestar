"""
Generate synthetic mood training data for XGBoost mood predictor (KAI-52).
Output: data/synthetic/mood_training.csv (300 rows)

Run from repo root:
    python data/synthetic/generate_seed.py
"""
import pandas as pd
import numpy as np

np.random.seed(42)
n = 300

df = pd.DataFrame({
    "total_minutes": np.random.uniform(30, 600, n),
    "nocturnal_ratio": np.random.uniform(0, 1, n),
    "social_ratio": np.random.uniform(0, 1, n),
    "avg_scroll_speed": np.random.uniform(100, 1500, n),
    "session_count": np.random.randint(1, 30, n),
    "max_session_minutes": np.random.uniform(5, 180, n),
    "productive_ratio": np.random.uniform(0, 1, n),
    "phq9_current": np.random.randint(0, 27, n),
})

delta = np.zeros(n)

# High nocturnal + high social → mood worsens
mask_bad = (df.nocturnal_ratio > 0.4) & (df.social_ratio > 0.6)
delta[mask_bad] += np.random.uniform(1, 3, mask_bad.sum())

# Productive + low total usage → mood improves
mask_good = (df.productive_ratio > 0.5) & (df.total_minutes < 120)
delta[mask_good] -= np.random.uniform(1, 2, mask_good.sum())

df["phq9_delta_7d"] = delta.clip(-5, 5)

output_path = "data/synthetic/mood_training.csv"
df.to_csv(output_path, index=False)
print(f"Generated {len(df)} rows → {output_path}")
print(df.describe().to_string())
