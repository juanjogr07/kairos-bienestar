from celery import Celery
from celery.schedules import crontab
from ml_worker.config import REDIS_URL

app = Celery(
    "kairos_ml",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "ml_worker.tasks.feature_extraction",
        "ml_worker.tasks.inference",
        "ml_worker.tasks.training",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Bogota",
    enable_utc=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,  # one task at a time — ML is CPU-heavy
    task_acks_late=True,
)

# Nightly batch: compute features + run inference for all active users
app.conf.beat_schedule = {
    "nightly-features-and-inference": {
        "task": "ml_worker.tasks.feature_extraction.compute_all_users",
        "schedule": crontab(hour=2, minute=0),  # 2am Bogotá
    },
    "weekly-global-retraining": {
        "task": "ml_worker.tasks.training.retrain_global_models",
        "schedule": crontab(hour=3, minute=0, day_of_week=0),  # Sunday 3am
    },
}
