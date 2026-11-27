"""
Background tasks for analysis that can be too slow to run inline on a
request (large PCAP captures, bulk log files). These call the exact same
real analysis functions used by the synchronous API routes — no separate
"fake" logic path for the async version.
"""
import base64

from .celery_app import celery_app


@celery_app.task(bind=True, name="tasks.analyze_pcap_bytes")
def analyze_pcap_bytes_task(self, pcap_b64: str, filename: str):
    """
    Runs the same Scapy-based parsing as the synchronous /api/analyze/network
    endpoint, as a background job. Input is base64-encoded packet bytes
    (so this task has no dependency on FastAPI's UploadFile).
    """
    from .network_analyzer import analyze_pcap_bytes_sync
    data = base64.b64decode(pcap_b64)
    return analyze_pcap_bytes_sync(data, filename)


@celery_app.task(bind=True, name="tasks.analyze_logs_bulk")
def analyze_logs_bulk_task(self, log_text: str):
    """Runs the same log-analysis logic as the synchronous endpoint, as a background job."""
    from .log_analyzer import analyze_logs_sync
    return analyze_logs_sync(log_text, "auto")
