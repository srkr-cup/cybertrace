"""
Email Forensics Analyzer.

Real header parsing using Python's stdlib `email` package. No network
calls. Does not assert phishing/malicious based on SPF/DKIM/DMARC alone —
reports each authentication result and structural observation separately,
with the investigator left to weigh them.
"""
import re
from email import message_from_string
from email.utils import parseaddr, getaddresses

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/analyze/email", tags=["email-analyzer"])

URL_RE = re.compile(r"https?://[^\s\"'<>\)]+")
AUTH_RESULT_RE = re.compile(r"(spf|dkim|dmarc)=([a-zA-Z]+)", re.IGNORECASE)


class EmailAnalyzeIn(BaseModel):
    raw_email: str


def _domain_of(addr: str) -> str:
    return addr.split("@")[-1].lower() if "@" in addr else ""


@router.post("")
def analyze_email(payload: EmailAnalyzeIn):
    msg = message_from_string(payload.raw_email)

    from_header = msg.get("From", "") or ""
    reply_to_header = msg.get("Reply-To", "") or ""
    return_path_header = msg.get("Return-Path", "") or ""
    to_header = msg.get("To", "") or ""
    subject = msg.get("Subject", "") or ""
    message_id = msg.get("Message-ID", "") or ""
    date = msg.get("Date", "") or ""

    from_name, from_addr = parseaddr(from_header)
    _, reply_to_addr = parseaddr(reply_to_header)
    _, return_path_addr = parseaddr(return_path_header)
    recipients = [addr for _, addr in getaddresses([to_header]) if addr]

    received_headers = msg.get_all("Received", []) or []
    # extract IPs that appear in Received headers (sending-path IPs)
    ip_re = re.compile(r"\[?((?:\d{1,3}\.){3}\d{1,3})\]?")
    sending_ips = []
    for h in received_headers:
        sending_ips.extend(ip_re.findall(h))

    # authentication results (SPF/DKIM/DMARC) — read, never fabricated
    auth_header = msg.get("Authentication-Results", "") or ""
    auth_results = {k.lower(): v for k, v in AUTH_RESULT_RE.findall(auth_header)}

    # body + urls
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                try:
                    body += part.get_payload(decode=True).decode(errors="ignore")
                except Exception:
                    pass
    else:
        try:
            payload = msg.get_payload(decode=True)
            body = payload.decode(errors="ignore") if payload else msg.get_payload()
        except Exception:
            body = msg.get_payload() if isinstance(msg.get_payload(), str) else ""

    urls = sorted(set(URL_RE.findall(body)))

    # attachments metadata (never executed/opened — metadata only)
    attachments = []
    if msg.is_multipart():
        for part in msg.walk():
            filename = part.get_filename()
            if filename:
                payload = part.get_payload(decode=True)
                attachments.append({
                    "filename": filename,
                    "content_type": part.get_content_type(),
                    "size_bytes": len(payload) if payload else 0,
                })

    # structural indicators (observations, not verdicts)
    indicators = []
    from_domain = _domain_of(from_addr)
    reply_domain = _domain_of(reply_to_addr) if reply_to_addr else ""
    return_domain = _domain_of(return_path_addr) if return_path_addr else ""

    if reply_to_addr and reply_domain and reply_domain != from_domain:
        indicators.append({
            "type": "reply_to_mismatch",
            "severity": "info",
            "detail": f"Reply-To domain '{reply_domain}' differs from From domain '{from_domain}'.",
        })
    if return_path_addr and return_domain and return_domain != from_domain:
        indicators.append({
            "type": "return_path_mismatch",
            "severity": "info",
            "detail": f"Return-Path domain '{return_domain}' differs from From domain '{from_domain}'.",
        })
    for mech in ("spf", "dkim", "dmarc"):
        result = auth_results.get(mech)
        if result and result.lower() not in ("pass",):
            indicators.append({
                "type": f"{mech}_not_pass",
                "severity": "info",
                "detail": f"{mech.upper()} result reported as '{result}'. Not conclusive on its own.",
            })
    if not auth_header:
        indicators.append({
            "type": "no_authentication_results_header",
            "severity": "info",
            "detail": "No Authentication-Results header present — SPF/DKIM/DMARC status unknown from this evidence alone.",
        })

    return {
        "summary": {
            "from": from_addr or from_header,
            "from_display_name": from_name,
            "to": recipients,
            "reply_to": reply_to_addr or None,
            "return_path": return_path_addr or None,
            "subject": subject,
            "date": date,
            "message_id": message_id,
        },
        "authentication_results": {
            "raw_header": auth_header or None,
            "spf": auth_results.get("spf"),
            "dkim": auth_results.get("dkim"),
            "dmarc": auth_results.get("dmarc"),
        },
        "sending_path_ips": sorted(set(sending_ips)),
        "embedded_urls": urls,
        "attachments": attachments,
        "structural_indicators": indicators,
        "disclaimer": "These are structural observations only. SPF/DKIM/DMARC failure or header "
                       "mismatches do not alone prove phishing; correlate with other evidence before concluding.",
    }
