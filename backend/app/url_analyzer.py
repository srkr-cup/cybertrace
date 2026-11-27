"""
URL and Domain Analyzer.

Structural parsing (always works, no network). DNS/WHOIS lookups are
attempted live and degrade to an explicit "unavailable" state if the
deployment has no internet access or the lookup times out — never
fabricated. The app never fetches the URL's actual content; only DNS
metadata about its hostname is resolved, with private/internal targets
blocked.
"""
import ipaddress
import socket
from datetime import datetime, date
from urllib.parse import urlparse

from fastapi import APIRouter
from pydantic import BaseModel


router = APIRouter(prefix="/api/analyze/url", tags=["url-analyzer"])

SUSPICIOUS_TLDS = {"zip", "mov", "xyz", "top", "tk", "gq", "ml"}


class UrlAnalyzeIn(BaseModel):
    url: str
    resolve_dns: bool = True  # explicit opt-in for the live-lookup step
    lookup_whois: bool = False  # explicit opt-in — WHOIS lookups are slower and rate-limited by registries


def _json_safe(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    return value


def whois_lookup(domain: str):
    try:
        import whois
    except ImportError:
        return {"status": "not_configured", "note": "python-whois is not installed. Run: pip install python-whois"}
    try:
        w = whois.whois(domain)
        if not w or not w.domain_name:
            return {"status": "no_record", "note": "No WHOIS record returned — the registry may not respond to automated queries, or the domain may not exist."}
        return {
            "status": "ok",
            "registrar": _json_safe(w.registrar),
            "creation_date": _json_safe(w.creation_date),
            "expiration_date": _json_safe(w.expiration_date),
            "updated_date": _json_safe(w.updated_date),
            "name_servers": _json_safe(w.name_servers),
            "status_codes": _json_safe(w.status),
            "note": "Domain age alone is never used here to assess risk — this is reference data for the investigator.",
        }
    except Exception as e:
        return {"status": "error", "detail": str(e),
                "note": "WHOIS lookups depend on the registry's server responding; this environment's network access or the registry's rate limiting may be the cause."}


def is_ip_literal(host: str) -> bool:
    try:
        ipaddress.ip_address(host)
        return True
    except ValueError:
        return False


def is_private_or_blocked(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
        return ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast
    except ValueError:
        return True  # fail closed


@router.post("")
def analyze_url(payload: UrlAnalyzeIn):
    url = payload.url.strip()
    parsed = urlparse(url if "://" in url else f"http://{url}")
    host = parsed.hostname or ""
    port = parsed.port
    scheme = parsed.scheme
    path = parsed.path
    query = parsed.query

    structure = {
        "scheme": scheme,
        "hostname": host,
        "port": port,
        "path": path,
        "query": query,
        "is_ip_literal_host": is_ip_literal(host),
        "has_explicit_port": port is not None,
        "contains_percent_encoding": "%" in url,
        "subdomain_depth": max(host.count(".") - 1, 0) if host and not is_ip_literal(host) else 0,
    }
    tld = host.rsplit(".", 1)[-1].lower() if "." in host else ""
    structural_flags = []
    if structure["is_ip_literal_host"]:
        structural_flags.append("URL uses a raw IP address instead of a domain name.")
    if structure["has_explicit_port"] and port not in (80, 443):
        structural_flags.append(f"URL specifies a non-standard port ({port}).")
    if structure["contains_percent_encoding"]:
        structural_flags.append("URL contains percent-encoded characters.")
    if tld in SUSPICIOUS_TLDS:
        structural_flags.append(f"TLD '.{tld}' is commonly abused, though not inherently malicious.")

    dns_result = {"status": "not_attempted"}
    if payload.resolve_dns and host and not structure["is_ip_literal_host"]:
        try:
            resolved_ips = sorted(set(socket.gethostbyname_ex(host)[2]))
            blocked = [ip for ip in resolved_ips if is_private_or_blocked(ip)]
            dns_result = {
                "status": "ok" if resolved_ips else "no_records",
                "resolved_ips": resolved_ips,
                "blocked_private_targets": blocked,
                "note": "SSRF guard: any resolved private/internal/loopback address is flagged and "
                        "would be blocked if this URL were ever actively fetched.",
            }
        except socket.gaierror:
            dns_result = {"status": "resolution_failed", "detail": "Hostname did not resolve (NXDOMAIN or no DNS available in this environment)."}
        except Exception as e:
            dns_result = {"status": "error", "detail": str(e)}

    registration = {"status": "not_attempted"}
    if payload.lookup_whois and host and not structure["is_ip_literal_host"]:
        registration = whois_lookup(host)

    reputation = {
        "status": "disabled",
        "providers": [],
        "note": "External threat-intelligence lookups have been removed. This analyzer performs structure and optional DNS/WHOIS checks only.",
    }

    return {
        "url": url,
        "structure": structure,
        "structural_flags": structural_flags,
        "dns": dns_result,
        "domain_registration": registration,
        "reputation": reputation,
        "disclaimer": "Risk is never assessed from URL length, TLD or encoding alone. These are structural "
                       "observations to support — not replace — investigator judgment and reputation data.",
    }
