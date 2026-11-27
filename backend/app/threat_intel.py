"""
Threat Intelligence provider integrations.

Each provider is a real, working HTTP client against the documented public
API — it activates the moment you set its API key as an environment
variable. With no key set, it returns status "not_configured" rather than
fabricating a result. Results from different providers are always shown
separately; this module never merges them into one synthesized verdict.
"""
import os
import httpx
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy.orm import Session
from fastapi import Depends

from .database import get_db
from .models import ThreatIntelLookup

router = APIRouter(prefix="/api/threat-intel", tags=["threat-intel"])

VT_API_KEY = os.environ.get("VIRUSTOTAL_API_KEY")
ABUSEIPDB_API_KEY = os.environ.get("ABUSEIPDB_API_KEY")


class LookupIn(BaseModel):
    indicator: str
    indicator_type: str  # ip, domain, url, hash
    case_id: str | None = None


def _save(db: Session, case_id, indicator, provider, status, result):
    import json
    entry = ThreatIntelLookup(
        case_id=case_id, indicator=indicator, provider=provider,
        status=status, result_json=json.dumps(result)[:5000],
    )
    db.add(entry)
    db.commit()


def check_virustotal(indicator: str, indicator_type: str):
    if not VT_API_KEY:
        return {"provider": "virustotal", "status": "not_configured",
                "note": "Set VIRUSTOTAL_API_KEY to enable."}
    headers = {"x-apikey": VT_API_KEY}
    try:
        if indicator_type == "ip":
            url = f"https://www.virustotal.com/api/v3/ip_addresses/{indicator}"
        elif indicator_type == "domain":
            url = f"https://www.virustotal.com/api/v3/domains/{indicator}"
        elif indicator_type == "hash":
            url = f"https://www.virustotal.com/api/v3/files/{indicator}"
        elif indicator_type == "url":
            import base64
            url_id = base64.urlsafe_b64encode(indicator.encode()).decode().strip("=")
            url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        else:
            return {"provider": "virustotal", "status": "error", "detail": "Unsupported indicator_type"}

        resp = httpx.get(url, headers=headers, timeout=10)
        if resp.status_code == 404:
            return {"provider": "virustotal", "status": "not_found"}
        resp.raise_for_status()
        data = resp.json()
        stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
        return {"provider": "virustotal", "status": "ok", "analysis_stats": stats}
    except httpx.HTTPError as e:
        return {"provider": "virustotal", "status": "error", "detail": str(e)}


def check_abuseipdb(ip: str):
    if not ABUSEIPDB_API_KEY:
        return {"provider": "abuseipdb", "status": "not_configured",
                "note": "Set ABUSEIPDB_API_KEY to enable."}
    try:
        resp = httpx.get(
            "https://api.abuseipdb.com/api/v2/check",
            params={"ipAddress": ip, "maxAgeInDays": 90},
            headers={"Key": ABUSEIPDB_API_KEY, "Accept": "application/json"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json().get("data", {})
        return {
            "provider": "abuseipdb", "status": "ok",
            "abuse_confidence_score": data.get("abuseConfidenceScore"),
            "total_reports": data.get("totalReports"),
            "country_code": data.get("countryCode"),
        }
    except httpx.HTTPError as e:
        return {"provider": "abuseipdb", "status": "error", "detail": str(e)}


def check_urlhaus(indicator: str, indicator_type: str):
    try:
        if indicator_type == "url":
            resp = httpx.post("https://urlhaus-api.abuse.ch/v1/url/", data={"url": indicator}, timeout=10)
        elif indicator_type == "domain":
            resp = httpx.post("https://urlhaus-api.abuse.ch/v1/host/", data={"host": indicator}, timeout=10)
        else:
            return {"provider": "urlhaus", "status": "error", "detail": "Unsupported indicator_type for URLhaus"}
        resp.raise_for_status()
        data = resp.json()
        return {"provider": "urlhaus", "status": "ok", "query_status": data.get("query_status"),
                "url_count": len(data.get("urls", [])) if "urls" in data else (1 if data.get("query_status") == "ok" else 0)}
    except httpx.HTTPError as e:
        return {"provider": "urlhaus", "status": "error", "detail": str(e)}


@router.post("/lookup")
def lookup(payload: LookupIn, db: Session = Depends(get_db)):
    results = []
    if payload.indicator_type in ("ip", "domain", "url", "hash"):
        results.append(check_virustotal(payload.indicator, payload.indicator_type))
    if payload.indicator_type == "ip":
        results.append(check_abuseipdb(payload.indicator))
    if payload.indicator_type in ("url", "domain"):
        results.append(check_urlhaus(payload.indicator, payload.indicator_type))

    for r in results:
        _save(db, payload.case_id, payload.indicator, r["provider"], r["status"], r)

    return {"indicator": payload.indicator, "indicator_type": payload.indicator_type, "results": results}


@router.get("/status")
def integration_status():
    return {
        "virustotal": "configured" if VT_API_KEY else "not_configured",
        "abuseipdb": "configured" if ABUSEIPDB_API_KEY else "not_configured",
        "urlhaus": "configured",  # URLhaus's public API requires no key
    }
