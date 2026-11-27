"""
Background job endpoints for analysis that's too heavy to run inline on a
request (large PCAP captures, bulk log files). Requires a running Redis
instance and at least one Celery worker process:

    redis-server &
    celery -A app.celery_app worker --loglevel=info &

If Celery/Redis aren't reachable, enqueueing fails with a clear error
rather than silently pretending the job ran.
"""
import base64

from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel

router = APIRouter(prefix="/api/jobs", tags=["background-jobs"])


class LogJobIn(BaseModel):
    log_text: str


@router.post("/pcap")
async def enqueue_pcap_job(file: UploadFile = File(...)):
    try:
        from .tasks import analyze_pcap_bytes_task
    except Exception as e:
        return {"status": "error", "detail": f"Celery task module failed to load: {e}"}

    data = await file.read()
    b64 = base64.b64encode(data).decode()
    try:
        async_result = analyze_pcap_bytes_task.delay(b64, file.filename)
    except Exception as e:
        return {
            "status": "error",
            "detail": f"Could not enqueue job — is Redis running and reachable? ({e})",
        }
    return {"status": "queued", "job_id": async_result.id}


@router.post("/logs")
def enqueue_logs_job(payload: LogJobIn):
    try:
        from .tasks import analyze_logs_bulk_task
    except Exception as e:
        return {"status": "error", "detail": f"Celery task module failed to load: {e}"}

    try:
        async_result = analyze_logs_bulk_task.delay(payload.log_text)
    except Exception as e:
        return {
            "status": "error",
            "detail": f"Could not enqueue job — is Redis running and reachable? ({e})",
        }
    return {"status": "queued", "job_id": async_result.id}


@router.get("/{job_id}")
def get_job_status(job_id: str):
    try:
        from .celery_app import celery_app
    except Exception as e:
        return {"status": "error", "detail": f"Celery app failed to load: {e}"}

    async_result = celery_app.AsyncResult(job_id)
    if async_result.state == "PENDING":
        return {"job_id": job_id, "state": "pending_or_unknown"}
    if async_result.state == "STARTED":
        return {"job_id": job_id, "state": "running"}
    if async_result.state == "SUCCESS":
        return {"job_id": job_id, "state": "done", "result": async_result.result}
    if async_result.state == "FAILURE":
        return {"job_id": job_id, "state": "failed", "error": str(async_result.result)}
    return {"job_id": job_id, "state": async_result.state}
