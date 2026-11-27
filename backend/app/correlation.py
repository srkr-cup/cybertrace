"""
Evidence Correlation Engine.

Real, deterministic extraction of indicators (emails, URLs, domains, IPs)
from evidence text, plus construction of directly-observed relationships
between them. No fabricated or inferred threat verdicts are produced here.
"""
import re
from urllib.parse import urlparse

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
URL_RE = re.compile(r"https?://[^\s\"'<>\)]+")
IPV4_RE = re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b")


def extract_entities(text: str):
    """Returns a dict of entity_type -> set of values found directly in the text."""
    emails = set(EMAIL_RE.findall(text or ""))
    urls = set(URL_RE.findall(text or ""))
    ips = set(IPV4_RE.findall(text or ""))

    domains = set()
    for url in urls:
        try:
            host = urlparse(url).hostname
            if host:
                domains.add(host.lower())
        except Exception:
            continue
    # also pick up emails' domain parts
    for email in emails:
        domains.add(email.split("@")[-1].lower())

    return {
        "email": emails,
        "url": urls,
        "domain": domains,
        "ip": ips,
    }


def build_relationships(entities_by_type_and_id):
    """
    entities_by_type_and_id: dict like {"email": {value: entity_id}, "url": {...}, ...}
    Returns a list of (source_id, target_id, rel_type, confidence, explanation)
    based only on directly observable structural links (e.g. a URL's hostname
    IS a domain in the same evidence -> URL_RESOLVES_TO_DOMAIN_NAME is a stretch,
    so we label these as OBSERVED_IN_SAME_EVIDENCE / EMAIL_DOMAIN_MATCH only
    when structurally true).
    """
    rels = []
    emails = entities_by_type_and_id.get("email", {})
    urls = entities_by_type_and_id.get("url", {})
    domains = entities_by_type_and_id.get("domain", {})
    ips = entities_by_type_and_id.get("ip", {})

    # URL -> domain (hostname literally parsed from the URL: directly observed)
    for url_val, url_id in urls.items():
        try:
            host = urlparse(url_val).hostname
        except Exception:
            host = None
        if host and host.lower() in domains:
            rels.append((url_id, domains[host.lower()], "URL_HAS_HOSTNAME", "observed",
                         f"Hostname '{host}' parsed directly from URL."))

    # Email -> domain (sender/recipient domain literally parsed from the address)
    for email_val, email_id in emails.items():
        dom = email_val.split("@")[-1].lower()
        if dom in domains:
            rels.append((email_id, domains[dom], "EMAIL_HAS_DOMAIN", "observed",
                         f"Domain '{dom}' parsed directly from email address."))

    # Same-evidence co-occurrence between IP and domain/url is NOT asserted as
    # a resolution relationship here (would require an actual DNS lookup) —
    # deliberately omitted to avoid fabricating a DNS_RESOLVES_TO fact.

    return rels
