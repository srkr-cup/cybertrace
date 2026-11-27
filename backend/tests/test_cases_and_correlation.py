def _create_case(client, headers):
    resp = client.post("/api/cases", json={"title": "Test Case", "severity": "high"}, headers=headers)
    assert resp.status_code == 200
    return resp.json()["id"]


def test_create_and_list_case(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    resp = client.get("/api/cases", headers=auth_headers)
    assert resp.status_code == 200
    ids = [c["id"] for c in resp.json()]
    assert case_id in ids


def test_case_incident_details_create_update_and_clear(client, auth_headers):
    created = client.post("/api/cases", json={
        "title": "Payment message review",
        "incident_category": "Fake OTP or Bank Message",
        "incident_date": "2026-11-20",
    }, headers=auth_headers)
    assert created.status_code == 200
    case = created.json()
    assert case["incident_category"] == "Fake OTP or Bank Message"
    assert case["incident_date"] == "2026-11-20"

    updated = client.patch(f"/api/cases/{case['id']}", json={
        "title": "Updated payment message review",
        "description": "Caller reported an unexpected code request.",
        "incident_category": "Phishing",
        "incident_date": "2026-11-21",
    }, headers=auth_headers)
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated payment message review"
    assert updated.json()["description"] == "Caller reported an unexpected code request."
    assert updated.json()["incident_category"] == "Phishing"
    assert updated.json()["incident_date"] == "2026-11-21"

    cleared = client.patch(f"/api/cases/{case['id']}", json={
        "incident_category": None,
        "incident_date": None,
    }, headers=auth_headers)
    assert cleared.status_code == 200
    assert cleared.json()["incident_category"] is None
    assert cleared.json()["incident_date"] is None


def test_case_rejects_unknown_incident_category(client, auth_headers):
    response = client.post("/api/cases", json={
        "title": "Invalid category",
        "incident_category": "Something else",
    }, headers=auth_headers)
    assert response.status_code == 422


def test_evidence_upload_computes_hashes_and_extracts_entities(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    text = "From: attacker@evil-login.com\nClick http://evil-login.com/verify and ping 203.0.113.55"
    resp = client.post(
        f"/api/cases/{case_id}/evidence",
        data={"raw_text": text, "evidence_type": "email"},
        headers=auth_headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["sha256"]) == 64
    assert data["entities_found_total"] >= 3


def test_correlation_graph_has_nodes_and_edges(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    text = "From: attacker@evil-login.com\nTo: victim@company.com\nSee http://evil-login.com/verify"
    uploaded = client.post(f"/api/cases/{case_id}/evidence", data={"raw_text": text, "evidence_type": "email"}, headers=auth_headers)

    resp = client.get(f"/api/cases/{case_id}/graph", headers=auth_headers)
    assert resp.status_code == 200
    graph = resp.json()
    assert len(graph["nodes"]) > 0
    email_node = next(node for node in graph["nodes"] if node["value"] == "attacker@evil-login.com")
    assert email_node["first_seen_at"]
    assert email_node["first_seen_evidence_id"] == uploaded.json()["evidence_id"]
    assert email_node["sources"][0]["evidence_id"] == uploaded.json()["evidence_id"]
    assert email_node["sources"][0]["filename"] == "pasted-text.txt"
    # the URL's hostname should be linked to the domain entity
    assert any(e["type"] == "URL_HAS_HOSTNAME" for e in graph["edges"])


def test_correlation_never_fabricates_dns_resolution(client, auth_headers):
    """The engine must not claim an IP 'resolves from' a domain just because
    both appear in the same evidence — that would require an actual DNS
    lookup, which correlation.py deliberately does not perform."""
    case_id = _create_case(client, auth_headers)
    text = "Contact server at 203.0.113.55 regarding evil-login.com"
    client.post(f"/api/cases/{case_id}/evidence", data={"raw_text": text, "evidence_type": "text"}, headers=auth_headers)
    resp = client.get(f"/api/cases/{case_id}/graph", headers=auth_headers)
    graph = resp.json()
    rel_types = {e["type"] for e in graph["edges"]}
    assert "DNS_RESOLVES_TO" not in rel_types
    assert "IP_RESOLVES_TO_DOMAIN" not in rel_types


def test_timeline_sorted_and_has_case_created_event(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    client.post(f"/api/cases/{case_id}/evidence", data={"raw_text": "hello@example.com", "evidence_type": "text"}, headers=auth_headers)
    resp = client.get(f"/api/cases/{case_id}/timeline", headers=auth_headers)
    assert resp.status_code == 200
    events = resp.json()["events"]
    timestamps = [e["timestamp"] for e in events]
    assert timestamps == sorted(timestamps)
    assert any(e["type"] == "case_created" for e in events)


def test_report_json_matches_case_data(client, auth_headers):
    response = client.post("/api/cases", json={
        "title": "Report metadata case",
        "incident_category": "Phishing",
        "incident_date": "2026-11-18",
    }, headers=auth_headers)
    case_id = response.json()["id"]
    resp = client.get(f"/api/cases/{case_id}/report.json", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["case"]["id"] == case_id
    assert resp.json()["case"]["incident_category"] == "Phishing"
    assert resp.json()["case"]["incident_date"] == "2026-11-18"


def test_report_pdf_is_valid_pdf_bytes(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    resp = client.get(f"/api/cases/{case_id}/report.pdf", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.content[:4] == b"%PDF"


def test_case_analysis_and_report_routes_require_authentication(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    routes = [
        ("GET", f"/api/cases/{case_id}/graph"),
        ("GET", f"/api/cases/{case_id}/timeline"),
        ("GET", f"/api/cases/{case_id}/report.json"),
        ("GET", f"/api/cases/{case_id}/report.pdf"),
        ("POST", f"/api/cases/{case_id}/ai/ask"),
    ]
    for method, path in routes:
        response = client.request(method, path, json={"question": "Summarize this case."})
        assert response.status_code == 401, path


def test_cybercrime_knowledge_catalog_is_complete_bilingual_and_searchable(client, auth_headers):
    response = client.get("/api/knowledge/crimes?language=en", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["count"] == 20
    assert all("definition" in item and "warning_signs" in item and "if_affected" in item for item in data["items"])
    assert any(resource["url"] == "https://cybercrime.gov.in/" for resource in data["sources"])

    telugu = client.get("/api/knowledge/crimes?language=te", headers=auth_headers).json()
    assert telugu["items"][0]["title"]["te"]
    assert any("ఫిషింగ్" in item["title"]["te"] for item in telugu["items"])

    filtered = client.get("/api/knowledge/crimes?q=UPI&language=en", headers=auth_headers).json()
    assert filtered["count"] >= 1
    assert any(item["id"] == "upi-fraud" for item in filtered["items"])


def test_cybercrime_knowledge_rejects_invalid_language(client, auth_headers):
    response = client.get("/api/knowledge/crimes?language=fr", headers=auth_headers)
    assert response.status_code == 422


def test_cybercrime_knowledge_is_available_without_investigator_login(client):
    response = client.get("/api/knowledge/crimes?language=te")
    assert response.status_code == 200
    assert response.json()["count"] == 20


def test_quiz_is_bilingual_does_not_expose_answers_and_scores_on_backend(client):
    quiz = client.get("/api/education/quiz?language=en").json()
    assert quiz["question_count"] == 10
    assert all("correct_option" not in question for question in quiz["questions"])

    telugu = client.get("/api/education/quiz?language=te").json()
    assert "ఓటీపీ" in telugu["questions"][0]["prompt"]

    answers = {question["id"]: "b" for question in quiz["questions"]}
    result = client.post("/api/education/quiz/score", json={"language": "en", "answers": answers})
    assert result.status_code == 200
    assert result.json()["score"] == 8
    assert result.json()["total"] == 10
    assert len(result.json()["answers"]) == 10


def test_quiz_rejects_incomplete_submission(client):
    response = client.post("/api/education/quiz/score", json={"language": "en", "answers": {"otp": "b"}})
    assert response.status_code == 422


def test_reporting_guides_are_bilingual_and_scope_financial_helpline(client):
    english = client.get("/api/education/reporting-guide?language=en").json()
    assert len(english["topics"]) == 6
    financial = next(topic for topic in english["topics"] if topic["id"] == "financial-fraud")
    phishing = next(topic for topic in english["topics"] if topic["id"] == "phishing")
    assert financial["financial_helpline_applies"] is True
    assert any("1930" in step for step in financial["steps"])
    assert phishing["financial_helpline_applies"] is False
    assert english["reporting_portal"] == "https://cybercrime.gov.in/"

    telugu = client.get("/api/education/reporting-guide?language=te").json()
    assert "ఆర్థిక" in telugu["topics"][0]["title"]
    assert "does not file" in english["notice"]


def test_official_contact_directory_filters_and_labels_verification(client):
    response = client.get("/api/contacts?country=India&category=Financial%20Cyber%20Fraud")
    assert response.status_code == 200
    contacts = response.json()["contacts"]
    assert any(contact["id"] == "india-1930" for contact in contacts)
    assert any(contact["id"] == "andhra-pradesh-cybercrime" for contact in contacts)

    andhra = client.get("/api/contacts?q=Andhra%20Pradesh").json()["contacts"]
    state_contact = next(contact for contact in andhra if contact["id"] == "andhra-pradesh-cybercrime")
    assert state_contact["phone"] == "0863-2340559"
    assert state_contact["email"] == "cybercrimes1930@cid.appolice.gov.in"
    assert state_contact["verification_status"].startswith("Verified")

    cisa = client.get("/api/contacts?q=CISA").json()["contacts"]
    assert cisa[0]["verification_status"] == "Reporting destination not verified"


def test_audit_log_records_case_creation(client, auth_headers):
    case_id = _create_case(client, auth_headers)
    resp = client.get("/api/audit-logs", headers=auth_headers)
    assert resp.status_code == 200
    actions = [a["action"] for a in resp.json()]
    assert "case.create" in actions


def test_dashboard_stats_reflect_created_case(client, auth_headers):
    _create_case(client, auth_headers)
    resp = client.get("/api/stats", headers=auth_headers)
    data = resp.json()
    assert data["total_cases"] >= 1


def test_dashboard_stats_requires_authentication(client):
    resp = client.get("/api/stats")
    assert resp.status_code == 401
