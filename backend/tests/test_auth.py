def test_register_success(client):
    """A new user can register successfully"""
    response = client.post("/auth/register", json={
        "username": "ruba",
        "email": "ruba@example.com",
        "password": "password123"
    })
    assert response.status_code == 201
    assert "user_id" in response.json()

def test_register_duplicate_email(client):
    """Registering with an existing email should fail"""
    client.post("/auth/register", json={
        "username": "ruba",
        "email": "ruba@example.com",
        "password": "password123"
    })
    # Try registering again with same email
    response = client.post("/auth/register", json={
        "username": "ruba2",
        "email": "ruba@example.com",
        "password": "password456"
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login_success(client):
    """Registered user can login and get tokens"""
    client.post("/auth/register", json={
        "username": "ruba",
        "email": "ruba@example.com",
        "password": "password123"
    })
    response = client.post("/auth/login", data={
        "username": "ruba@example.com",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()

def test_login_wrong_password(client):
    """Login with wrong password should fail"""
    client.post("/auth/register", json={
        "username": "ruba",
        "email": "ruba@example.com",
        "password": "password123"
    })
    response = client.post("/auth/login", data={
        "username": "ruba@example.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_get_me(auth_client):
    """Authenticated user can get their own info"""
    response = auth_client.get("/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_refresh_token(client):
    # Register and login first
    client.post("/auth/register", json={
        "username": "refreshuser",
        "email": "refresh@example.com",
        "password": "testpassword123"
    })
    response = client.post("/auth/login", data={
        "username": "refresh@example.com",
        "password": "testpassword123"
    })
    refresh_token = response.json()["refresh_token"]

    # Now test the refresh endpoint
    response = client.post(f"/auth/refresh?token={refresh_token}")
    assert response.status_code == 200
    assert "access_token" in response.json()