def test_register_weak_password_rejected(client):
    resp = client.post("/api/auth/register", json={"email": "a@example.com", "password": "short"})
    assert resp.status_code == 422


def test_register_and_login(client):
    resp = client.post("/api/auth/register", json={"email": "b@example.com", "password": "GoodPass123"})
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data and "refresh_token" in data

    resp = client.post("/api/auth/login", json={"email": "b@example.com", "password": "GoodPass123"})
    assert resp.status_code == 200


def test_login_wrong_password_rejected(client):
    client.post("/api/auth/register", json={"email": "c@example.com", "password": "GoodPass123"})
    resp = client.post("/api/auth/login", json={"email": "c@example.com", "password": "WrongPass123"})
    assert resp.status_code == 401


def test_login_rate_limited_after_five_failures(client):
    client.post("/api/auth/register", json={"email": "d@example.com", "password": "GoodPass123"})
    for _ in range(5):
        resp = client.post("/api/auth/login", json={"email": "d@example.com", "password": "WrongPass123"})
        assert resp.status_code == 401
    resp = client.post("/api/auth/login", json={"email": "d@example.com", "password": "WrongPass123"})
    assert resp.status_code == 429


def test_refresh_token_rotation_and_single_use(client):
    resp = client.post("/api/auth/register", json={"email": "e@example.com", "password": "GoodPass123"})
    refresh = resp.json()["refresh_token"]

    resp2 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert resp2.status_code == 200
    assert resp2.json()["refresh_token"] != refresh

    # old token must now be dead
    resp3 = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert resp3.status_code == 401


def test_me_requires_bearer_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401

    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert resp.status_code == 401
