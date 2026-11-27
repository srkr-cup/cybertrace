import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture()
def client(monkeypatch):
    """
    Fresh FastAPI TestClient per test, backed by its own temporary SQLite
    file so tests never share state or touch the developer's real DB.
    """
    db_fd, db_path = tempfile.mkstemp(suffix=".db")
    os.close(db_fd)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    for key in (
        "VIRUSTOTAL_API_KEY",
        "ABUSEIPDB_API_KEY",
        "GOOGLE_API_KEY",
        "ANTHROPIC_API_KEY",
        "OPENAI_API_KEY",
    ):
        monkeypatch.setenv(key, "")

    # Reload modules that cached DATABASE_URL/engine at import time
    for mod_name in list(sys.modules):
        if mod_name.startswith("app"):
            del sys.modules[mod_name]

    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        yield c

    os.unlink(db_path)


@pytest.fixture()
def auth_headers(client):
    resp = client.post("/api/auth/register", json={
        "email": "pytest-user@example.com", "password": "TestPass123",
    })
    assert resp.status_code == 200

    from app.database import SessionLocal
    from app.models import User
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == "pytest-user@example.com").first()
        user.role = "admin"
        db.commit()
    finally:
        db.close()

    login = client.post("/api/auth/login", json={
        "email": "pytest-user@example.com", "password": "TestPass123",
    })
    assert login.status_code == 200
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
