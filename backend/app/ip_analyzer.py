"""
IP Intelligence Analyzer.

Validation and classification are always real (stdlib ipaddress). Reverse
DNS is attempted live. ASN/organization/geolocation and abuse-reputation
require external provider API keys (see threat_intel.py) — reported as
not_configured rather than guessed.
"""
import ipaddress
import socket

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/analyze/ip", tags=["ip-analyzer"])


class IpAnalyzeIn(BaseModel):
    ip: str


@router.post("")
def analyze_ip(payload: IpAnalyzeIn):
    raw = payload.ip.strip()
    try:
        ip_obj = ipaddress.ip_address(raw)
    except ValueError:
        return {"ip": raw, "valid": False, "error": "Not a valid IPv4 or IPv6 address."}

    classification = {
        "version": ip_obj.version,
        "is_private": ip_obj.is_private,
        "is_loopback": ip_obj.is_loopback,
        "is_link_local": ip_obj.is_link_local,
        "is_multicast": ip_obj.is_multicast,
        "is_reserved": ip_obj.is_reserved,
        "is_global": ip_obj.is_global,
    }

    reverse_dns = {"status": "not_attempted"}
    try:
        hostname, _, _ = socket.gethostbyaddr(str(ip_obj))
        reverse_dns = {"status": "ok", "ptr_record": hostname}
    except socket.herror:
        reverse_dns = {"status": "no_ptr_record"}
    except Exception as e:
        reverse_dns = {"status": "error", "detail": str(e)}

    return {
        "ip": str(ip_obj),
        "valid": True,
        "classification": classification,
        "reverse_dns": reverse_dns,
        "asn_and_org": {
            "status": "not_configured",
            "note": "Connect an ASN/WHOIS or AbuseIPDB key in Integrations for ownership/org data.",
        },
        "geolocation": {
            "status": "not_configured",
            "note": "Geolocation requires a provider API key. Note: even when available, this is an "
                    "estimate — never treat it as a precise physical location.",
        },
        "abuse_reputation": {
            "status": "not_configured",
            "note": "Connect AbuseIPDB in Integrations to enable abuse-confidence scoring.",
        },
        "disclaimer": "A reputation score or PTR record is not proof of malicious behavior on its own.",
    }
