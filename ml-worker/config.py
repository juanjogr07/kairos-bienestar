import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODELS_DIR, exist_ok=True)

# Days of data required before personal model training
PERSONALIZATION_MIN_DAYS = 30
LSTM_PERSONALIZATION_MIN_DAYS = 60
FORECAST_MIN_DAYS = 30
CORRELATION_MIN_SURVEYS = 4

# Isolation Forest contamination rate
IF_CONTAMINATION = 0.05

# XGBoost triage thresholds
TRIAGE_THRESHOLDS = {
    "attention_fragmentation": 0.60,
    "nocturnal_pattern": 0.65,
    "doomscrolling": 0.70,
    "low_mood_indicator": 0.40,  # maps to PHQ-9 >= 5
    "anxiety_indicator": 0.40,   # maps to GAD-7 >= 5
}
