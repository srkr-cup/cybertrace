def test_email_analyzer_extracts_headers_and_flags_mismatch(client):
    raw = (
        "From: Bank Support <support@secure-bank-login.com>\n"
        "To: victim@company.com\n"
        "Reply-To: attacker@evil.ru\n"
        "Subject: Verify your account\n"
        "Authentication-Results: mx; spf=fail; dkim=none; dmarc=fail\n\n"
        "Click http://secure-bank-login.com/verify"
    )
    resp = client.post("/api/analyze/email", json={"raw_email": raw})
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"]["from"] == "support@secure-bank-login.com"
    assert data["authentication_results"]["spf"].lower() == "fail"
    assert "http://secure-bank-login.com/verify" in data["embedded_urls"]
    indicator_types = [i["type"] for i in data["structural_indicators"]]
    assert "reply_to_mismatch" in indicator_types


def test_url_analyzer_flags_ip_literal_host():
    pass  # covered via client fixture in test below


def test_url_analyzer_structural_flags(client):
    resp = client.post("/api/analyze/url", json={"url": "http://185.220.101.5:8080/x%20y", "resolve_dns": False})
    assert resp.status_code == 200
    data = resp.json()
    assert data["structure"]["is_ip_literal_host"] is True
    assert any("IP address" in f for f in data["structural_flags"])


def test_url_analyzer_can_skip_external_reputation(client, monkeypatch):
    from app import url_analyzer

    def unexpected_lookup(*_args):
        raise AssertionError("reputation lookup should be skipped")

    monkeypatch.setattr(url_analyzer, "check_virustotal", unexpected_lookup)
    monkeypatch.setattr(url_analyzer, "check_urlhaus", unexpected_lookup)
    response = client.post("/api/analyze/url", json={
        "url": "https://example.com/verify",
        "resolve_dns": False,
        "check_reputation": False,
    })
    assert response.status_code == 200
    assert response.json()["reputation"]["status"] == "not_requested"
    assert response.json()["reputation"]["providers"] == []


def test_message_analyzer_returns_telugu_explanation_when_requested(client):
    response = client.post("/api/analyze/message", json={
        "text": "Your bank OTP is 123456. Click https://example.com now.",
        "channel": "sms",
        "language": "te",
    })
    assert response.status_code == 200
    result = response.json()
    assert "హెచ్చరిక" in result["plain_language_summary"]
    assert any("ఓటీపీ" in item["plain_meaning"] for item in result["details"])
    assert all("Do not reply" not in step for step in result["safe_next_steps"])


def test_message_analyzer_extracts_link_domains_and_phone_numbers(client):
    response = client.post("/api/analyze/message", json={
        "text": "Call +91 98765 43210 or visit https://pay.example.in/verify",
        "channel": "whatsapp",
    })
    result = response.json()
    assert "https://pay.example.in/verify" in result["links_found"]
    assert "pay.example.in" in result["domains_found"]
    assert "+919876543210" in result["phone_numbers_found"]


def test_ip_analyzer_valid_public_ip(client):
    resp = client.post("/api/analyze/ip", json={"ip": "8.8.8.8"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["classification"]["is_private"] is False


def test_ip_analyzer_rejects_invalid_ip(client):
    resp = client.post("/api/analyze/ip", json={"ip": "999.999.1.1"})
    assert resp.status_code == 200
    assert resp.json()["valid"] is False


def test_ip_analyzer_private_ip_classified(client):
    resp = client.post("/api/analyze/ip", json={"ip": "192.168.1.5"})
    data = resp.json()
    assert data["classification"]["is_private"] is True


def test_file_analyzer_computes_correct_hashes(client):
    import hashlib
    content = b"hello cybertrace"
    resp = client.post("/api/analyze/file", files={"file": ("test.txt", content)})
    assert resp.status_code == 200
    data = resp.json()
    assert data["hashes"]["sha256"] == hashlib.sha256(content).hexdigest()
    assert data["hashes"]["md5"] == hashlib.md5(content).hexdigest()


def test_file_analyzer_detects_disguised_executable(client):
    fake_pdf_bytes = b"MZ\x90\x00\x03\x00\x00\x00fake-exe-content-padding"
    resp = client.post("/api/analyze/file", files={"file": ("disguised.pdf", fake_pdf_bytes)})
    data = resp.json()
    assert data["extension_type_mismatch"] is not None


def test_file_analyzer_yara_catches_eicar(client):
    eicar = rb"X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
    resp = client.post("/api/analyze/file", files={"file": ("eicar.txt", eicar)})
    data = resp.json()
    assert data["yara_matches"]["status"] == "ok"
    rule_names = [m["rule"] for m in data["yara_matches"]["matches"]]
    assert "EICAR_Test_String" in rule_names


def test_log_analyzer_counts_failures_by_correct_user(client):
    log_text = (
        "Jan 10 03:22:11 server sshd[1]: Failed password for invalid user admin from 203.0.113.9 port 1\n"
        "Jan 10 03:22:12 server sshd[1]: Failed password for invalid user admin from 203.0.113.9 port 2\n"
        "Jan 10 03:22:13 server sshd[1]: Failed password for invalid user root from 203.0.113.9 port 3\n"
    )
    resp = client.post("/api/analyze/logs", json={"log_text": log_text, "format": "auto"})
    data = resp.json()
    assert data["failures_by_user"]["admin"] == 2
    assert data["failures_by_user"]["root"] == 1
    assert data["failures_by_source_ip"]["203.0.113.9"] == 3


def test_threat_intel_status_reports_not_configured_without_keys(client):
    resp = client.get("/api/threat-intel/status")
    data = resp.json()
    assert data["virustotal"] == "not_configured"
    assert data["urlhaus"] == "configured"
