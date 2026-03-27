import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app

# --- Test Database Setup ---
# This is a SEPARATE database just for testing
# It gets created fresh before every test and deleted after
TEST_DATABASE_URL = "sqlite:///./test.db"  # Simple SQLite file — no PostgreSQL needed for tests!

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}  # Needed for SQLite only
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Override the real database with the test database ---
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

# --- This runs before ALL tests ---
@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)   # Create all tables fresh
    yield
    Base.metadata.drop_all(bind=engine)     # Delete all tables after test

# --- Test client --- 
# This is like a fake browser that calls your API in tests
@pytest.fixture
def client():
    return TestClient(app)

# --- Reusable helper: Register + Login, return token ---
# Almost every test needs an authenticated user
# Instead of repeating login code in every test, we use this fixture
@pytest.fixture
def auth_client(client):
    # Register a user
    client.post("/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123"
    })
    # Login and get token
    response = client.post("/auth/login", data={
        "username": "test@example.com",
        "password": "testpassword123"
    })
    token = response.json()["access_token"]

    # Return client with auth headers pre-set
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client

# --- Reusable helper: Create a book and return it ---
@pytest.fixture
def sample_book(auth_client):
    response = auth_client.post("/create", json={
        "title": "Project Hail Mary",
        "author": "Andy Weir",
        "genre": "Science Fiction",
        "status": "reading",
        "pages_read": 100,
        "total_pages": 476,
        "rating": None,
        "date_started": "01-01-2025",
        "date_finished": None
    })
    assert response.status_code == 201
    return response.json()