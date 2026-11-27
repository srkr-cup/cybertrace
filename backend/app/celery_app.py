"""
Celery application for background analysis jobs (large PCAP files, bulk log
analysis). Broker/result backend default to a local Redis instance — set
CELERY_BROKER_URL / CELERY_RESULT_BACKEND env vars to point elsewhere.

Start a worker with:
    celery -A app.celery_app worker --loglevel=info
"""
import os
from celery import Celery

BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery("cybertrace", broker=BROKER_URL, backend=RESULT_BACKEND)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    result_expires=3600,
)

# Import task modules so Celery registers them
from . import tasks  # noqa: E402,F401
