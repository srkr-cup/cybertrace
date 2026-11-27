"""
System and Security Log Analyzer.

Real regex-based parsing for common formats (Linux auth.log/syslog style,
generic "key=value" security events, JSON-lines). Detects simple,
explainable patterns (repeated auth failures per source, rapid access-denied
bursts) via counting — not ML, not invented events.
"""
import json
import re
from collections import Counter, defaultdict

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/analyze/logs", tags=["log-analyzer"])

SYSLOG_RE = re.compile(
    r"^(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2})\s+(?P<host>\S+)\s+(?P<proc>\S+?):\s*(?P<msg>.*)$"
)
AUTH_FAIL_RE = re.compile(r"(failed|failure|invalid user|authentication failure)", re.IGNORECASE)
AUTH_SRC_IP_RE = re.compile(r"from\s+((?:\d{1,3}\.){3}\d{1,3})")
USER_RE = re.compile(r"\buser\s+([a-zA-Z0-9_\-.]+)", re.IGNORECASE)
USER_FALLBACK_RE = re.compile(r"\bfor\s+([a-zA-Z0-9_\-.]+)", re.IGNORECASE)
ACCESS_DENIED_RE = re.compile(r"(access denied|permission denied|denied)", re.IGNORECASE)


class LogAnalyzeIn(BaseModel):
    log_text: str
    format: str = "auto"  # auto | syslog | json


def parse_line(line: str, fmt: str):
    line = line.strip()
    if not line:
        return None
    if fmt in ("auto", "json") and line.startswith("{"):
        try:
            obj = json.loads(line)
            return {
                "raw": line,
                "timestamp": obj.get("timestamp") or obj.get("time") or obj.get("@timestamp"),
                "host": obj.get("host") or obj.get("hostname"),
                "message": obj.get("message") or obj.get("msg") or json.dumps(obj),
                "severity": obj.get("severity") or obj.get("level"),
                "source_ip": obj.get("src_ip") or obj.get("source_ip") or obj.get("ip"),
                "user": obj.get("user") or obj.get("username"),
            }
        except json.JSONDecodeError:
            pass
    m = SYSLOG_RE.match(line)
    if m:
        d = m.groupdict()
        return {
            "raw": line,
            "timestamp": f"{d['month']} {d['day']} {d['time']}",
            "host": d["host"],
            "message": d["msg"],
            "severity": None,
            "source_ip": None,
            "user": None,
        }
    return {"raw": line, "timestamp": None, "host": None, "message": line, "severity": None, "source_ip": None, "user": None}


def analyze_logs_sync(log_text: str, fmt: str = "auto"):
    """
    Core log analysis logic, shared by the synchronous endpoint below and
    the Celery background task in tasks.py.
    """
    lines = log_text.splitlines()
    parsed = [p for p in (parse_line(l, fmt) for l in lines) if p]

    fail_events = []
    denied_events = []
    for p in parsed:
        msg = p["message"] or ""
        if AUTH_FAIL_RE.search(msg):
            ip_match = AUTH_SRC_IP_RE.search(msg)
            user_match = USER_RE.search(msg) or USER_FALLBACK_RE.search(msg)
            fail_events.append({
                **p,
                "source_ip": p.get("source_ip") or (ip_match.group(1) if ip_match else None),
                "user": p.get("user") or (user_match.group(1) if user_match else None),
            })
        if ACCESS_DENIED_RE.search(msg):
            denied_events.append(p)

    fail_by_ip = Counter(e["source_ip"] for e in fail_events if e["source_ip"])
    fail_by_user = Counter(e["user"] for e in fail_events if e["user"])

    suspicious_patterns = []
    for ip, count in fail_by_ip.items():
        if count >= 5:
            suspicious_patterns.append({
                "type": "repeated_auth_failure",
                "detail": f"{count} authentication failures from {ip} in this log excerpt.",
            })
    for user, count in fail_by_user.items():
        if count >= 5:
            suspicious_patterns.append({
                "type": "repeated_auth_failure_for_user",
                "detail": f"{count} authentication failures targeting user '{user}' in this log excerpt.",
            })
    if len(denied_events) >= 10:
        suspicious_patterns.append({
            "type": "access_denied_burst",
            "detail": f"{len(denied_events)} access-denied events in this log excerpt.",
        })

    return {
        "total_lines": len(lines),
        "parsed_events": len(parsed),
        "auth_failure_events": len(fail_events),
        "access_denied_events": len(denied_events),
        "failures_by_source_ip": dict(fail_by_ip.most_common(20)),
        "failures_by_user": dict(fail_by_user.most_common(20)),
        "suspicious_patterns": suspicious_patterns,
        "sample_parsed_events": parsed[:50],
        "disclaimer": "Detection here is rule-based counting on what is literally present in the log text "
                      "provided — no events are inferred or fabricated.",
    }


@router.post("")
def analyze_logs(payload: LogAnalyzeIn):
    """Synchronous analysis — fine for typical log excerpts. For very large
    log files, use POST /api/jobs/logs instead to run this in the background."""
    return analyze_logs_sync(payload.log_text, payload.format)
