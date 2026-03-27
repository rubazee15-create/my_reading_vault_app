def test_view_books_empty(auth_client):
    """New user has no books"""
    response = auth_client.get("/view_books")
    assert response.status_code == 200
    assert response.json() == []

def test_create_book_success(auth_client):
    """User can create a new book"""
    response = auth_client.post("/create", json={
        "title": "Fourth Wing",
        "author": "Rebecca Yarros",
        "genre": "Fantasy",
        "status": "completed",
        "pages_read": 544,
        "total_pages": 544,
        "rating": 5,
        "date_started": "01-01-2025",
        "date_finished": "15-01-2025"
    })
    assert response.status_code == 201
    assert response.json()["message"] == "Book created successfully!"

def test_create_duplicate_book(auth_client):
    """Creating the same book twice should fail"""
    book_data = {
        "title": "Fourth Wing",
        "author": "Rebecca Yarros",
        "genre": "Fantasy",
        "status": "completed",
        "pages_read": 544,
        "total_pages": 544,
        "date_finished": "15-01-2025"
    }
    auth_client.post("/create", json=book_data)
    response = auth_client.post("/create", json=book_data)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]

def test_view_books_after_create(auth_client, sample_book):
    """After creating a book, it appears in view_books"""
    response = auth_client.get("/view_books")
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["title"] == "Project Hail Mary"

def test_get_single_book(auth_client, sample_book):
    """User can fetch a single book by ID"""
    books = auth_client.get("/view_books").json()
    book_id = books[0]["id"]
    response = auth_client.get(f"/book/{book_id}")
    assert response.status_code == 200
    assert response.json()["title"] == "Project Hail Mary"

def test_get_nonexistent_book(auth_client):
    """Fetching a book that doesn't exist returns 404"""
    response = auth_client.get("/book/99999")
    assert response.status_code == 404

def test_update_book(auth_client, sample_book):
    """User can update a book's details"""
    books = auth_client.get("/view_books").json()
    book_id = books[0]["id"]
    response = auth_client.put(f"/edit/{book_id}", json={
        "pages_read": 200,
        "status": "reading"
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Book updated successfully!"

def test_delete_book(auth_client, sample_book):
    """User can delete a book"""
    books = auth_client.get("/view_books").json()
    book_id = books[0]["id"]
    response = auth_client.delete(f"/delete/{book_id}")
    assert response.status_code == 200
    # Verify it's gone
    response = auth_client.get("/view_books")
    assert response.json() == []

def test_book_progress(auth_client, sample_book):
    """Progress endpoint returns correct percentage"""
    books = auth_client.get("/view_books").json()
    book_id = books[0]["id"]
    response = auth_client.get(f"/book/{book_id}/progress")
    assert response.status_code == 200
    data = response.json()
    assert data["percentage"] == round((100 / 476) * 100, 2)
    assert data["pages_left"] == 376