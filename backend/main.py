# Importing libraries
from fastapi import FastAPI, Path, HTTPException, Query, Depends, File, UploadFile
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, computed_field, model_validator
from typing import Annotated, Literal, Optional
from datetime import date
from sqlalchemy.orm import Session
from auth import get_current_user
from database import get_db
from models import Book as BookModel, User, Author as AuthorModel
import json
from routers.auth_router import router as auth_router
import httpx 
import shutil 
import uuid
import os


app = FastAPI()

app.mount("/covers", StaticFiles(directory="uploads"), name="covers")

# Preparing the backend - CORS(Cross-Origin Resource Sharing)
# Defining who is allowed to talk to my API 
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],    # Allows GET, POST, PUT, DELETE etc.
    allow_headers=["*"],    # Allows all extra information sent in the requests
)

# Making a class that will inheret the base model - Making a Pydantic model for creating new book in the database (JSON file)
class Book(BaseModel):
    # Building fields that are required to create a Book (e.g. refer to books.json fields) - with description and annotations
    title: Annotated[str, Field(..., description="Title of the book", example="Fourth Wing")]
    author: Annotated[str, Field(..., description="Author of the book", example="Rebecca Yarros")]
    genre: Annotated[str, Field(..., description="Genre of the book", example="Fantasy")]
    
    status: Annotated[Literal["completed", "not read", "reading"], Field(..., description="Reading status of the book")]
    
    pages_read: Annotated[int, Field(0, ge=0, description="Number of pages read of the book", example=544)]
    total_pages: Annotated[int, Field(..., gt=0, description="Total number of pages of the book", example=544)]
    
    # Optional fields 
    rating: Annotated[Optional[int], Field(default=None, ge=0, le=5, description="Total rating of the book out of 5", examples=[4])]
    date_started: Annotated[Optional[str], Field(default=None, description="Starting date (DD-MM-YYYY)", example="12-12-2025")]
    date_finished: Annotated[Optional[str], Field(default=None, description="Finsih date (DD-MM-YYYY)", example="17-12-2025")]

    # Adding more computed fields to make the app more user friendly
    @computed_field
    @property
    def pages_left(self) -> int:
        pages_left = self.total_pages - self.pages_read
        return pages_left
    
    @computed_field
    @property
    def progress_percentage(self) -> float:
        # Calculating the progress percentage and rounding it to 2 decimal places for better readability
        progress_percentage = round((self.pages_read / self.total_pages) * 100, 2)
        return progress_percentage
    
    # Adding a model validator to Book
    @model_validator(mode="after")
    def check_status_dates(self):
        if self.status == "completed" and not self.date_finished:
            raise ValueError("Completed books require a finished date")
        if self.status == "not read" and self.pages_read > 0:
            raise ValueError("Unread books should have 0 pages read")
        # Preventing from entering read_pages exceeding the total_pages
        if self.pages_read > self.total_pages:
            raise ValueError("Pages read can not exceed total pages")
        return self

# # Second Pydantic model for PUT (Update) function
# # Not passing ID as we are asking for it as a Path Parameter, so it will not be a part of the request body
# class BookUpdate(BaseModel):
#     title: Annotated[Optional [str], Field(default=None)]
#     author: Annotated[Optional [str], Field(default=None)]
#     genre: Annotated[Optional [str], Field(default=None)]
    
#     status: Annotated[Optional [Literal["completed", "not read", "reading"]], Field(default=None)]
    
#     pages_read: Annotated[Optional [int], Field(default=None)]
#     total_pages: Annotated[Optional [int], Field(default=None)]
    
#     # Optional fields 
#     rating: Annotated[Optional[int], Field(default=None, gte=0, lte=5)]
#     date_started: Annotated[Optional[str], Field(default=None, description="Starting date (DD-MM-YYY)")]
#     date_finished: Annotated[Optional[str], Field(default=None, description="Finsih date (DD-MM-YYY)")]

class BookUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    genre: Optional[str] = None
    status: Optional[Literal["completed", "not read", "reading"]] = None
    pages_read: Optional[int] = Field(default=None, ge=0)
    total_pages: Optional[int] = Field(default=None, gt=0)
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    date_started: Optional[str] = None
    date_finished: Optional[str] = None

# New Pydantic model for importing books from Open Library API. This will be used in the frontend when the user selects a book from the search results and wants to add it to their reading vault. The fields in this model are a combination of the fields we get from the Open Library API and the fields we have in our Book model. The fields that are not provided by the Open Library API will be required for the user to fill in before adding the book to their reading vault.
class BookImport(BaseModel):
    title: str
    author: str
    total_pages: Optional[int] = None
    published_year: Optional[int] = None
    cover_image: Optional[str] = None
    isbn: Optional[str] = None
    # User still needs to fill these — Open Library doesn't know them
    genre: str
    status: Literal["completed", "not read", "reading"]
    pages_read: int = 0
    rating: Optional[int] = Field(default=None, ge=0, le=5)
    date_started: Optional[str] = None
    date_finished: Optional[str] = None

# # Before making the endpoints we have to make a function to load the data in the books.json file because we will be using that data in the endpoints.
# def load_data():
#     with open("books.json", "r") as file:
#         data = json.load(file)

#     return data  

# # Saving the new book's data in the exisiting 'books.json' file 
# def save_data(data):
#     with open("books.json", "w") as file:
#         json.dump(data, file, indent=4)


# ENDPOINTS
# Creating our endpoints - Staring with the basic ones and then moving to the more complex ones.
# Starting with GET (Retrieve) endpoints to view the data in the JSON file and then moving to POST endpoint to create a new book and add it to the JSON file.
@app.get("/")           # This endpoint will be the root endpoint of our API and will return a simple message to indicate that the API is working.
def hello():
    return {"message": "Reading Tracker API is up and running!"}

@app.get("/about")
def about():            # This endpoint will provide information about the API and its purpose.
    return {"message": "This is a fully functional API to track and manage your reading habits."}

@app.get("/view_books")
def view_books(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):  # This endpoint will allow users to view all the books they have added to their reading vault.
    books = db.query(BookModel).filter(BookModel.owner_id == current_user.id).all()
    return books

# Including new operations to understand path parameters and query parameters in FastAPI.

@app.get("/search")
def search_books(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    genre: Optional[str] = Query(default=None, description="Filter by genre e.g. Fantasy"),
    status: Optional[Literal["completed", "not read", "reading"]] = Query(default=None, description="Filter by reading status"),
    rating: Optional[int] = Query(default=None, ge=0, le=5, description="Filter by rating (0-5)"),
    search: Optional[str] = Query(default=None, description="Search by title or author name")
):
    # Start with base query — only this user's books
    query = db.query(BookModel).filter(BookModel.owner_id == current_user.id)

    # Apply filters only if they were provided
    if genre:
        query = query.filter(BookModel.genre.ilike(f"%{genre}%"))
    if status:
        query = query.filter(BookModel.status == status)
    if rating is not None:
        query = query.filter(BookModel.rating == rating)
    if search:
        query = query.filter(
            BookModel.title.ilike(f"%{search}%") |
            BookModel.author.ilike(f"%{search}%")
        )

    books = query.all()

    if not books:
        raise HTTPException(status_code=404, detail="No books found matching your filters!")

    return books

# Adding an endpoint to search for books using the Open Library API. This will allow users to search for books by title and get details like author, total pages, published year, cover image etc. This can be used as a reference for users to add books to their reading vault.
@app.get("/books/search")
async def search_open_library(
    title: str = Query(..., description="Book title to search for e.g. Fourth Wing"),
    current_user: User = Depends(get_current_user)
):
    url = f"https://openlibrary.org/search.json?title={title}&limit=5"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise HTTPException(status_code=503, detail="Open Library API is unavailable. Try again later.")

    data = response.json()
    results = data.get("docs", [])

    if not results:
        raise HTTPException(status_code=404, detail=f"No books found for '{title}'. Try a different title.")

    # Format the results cleanly
    books = []
    for book in results:
        isbn_list = book.get("isbn", [])
        isbn = isbn_list[0] if isbn_list else None

        # Build cover image URL from Open Library cover ID
        cover_id = book.get("cover_i")
        cover_image = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else None

        books.append({
            "title": book.get("title", "Unknown Title"),
            "author": book.get("author_name", ["Unknown Author"])[0],
            "total_pages": book.get("number_of_pages_median", None),
            "published_year": book.get("first_publish_year", None),
            "cover_image": cover_image,
            "isbn": isbn,
            "open_library_key": book.get("key")  # Unique ID — useful for frontend selection
        })

    return {
        "query": title,
        "total_results": len(books),
        "books": books
    }

# Adding an endpoint to import a book from the Open Library search results into the user's reading vault. This will take the details of the selected book from the frontend, validate them, and then save them to the database (JSON file) under the user's account.
@app.post("/books/import")
def import_book(
    book: BookImport,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if this book already exists in the user's vault
    existing = db.query(BookModel).filter(
        BookModel.title == book.title,
        BookModel.owner_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="This book is already in your vault!")

    # Validate pages_read vs total_pages if total_pages is provided
    if book.total_pages and book.pages_read > book.total_pages:
        raise HTTPException(status_code=400, detail="Pages read cannot exceed total pages!")

    # Validate completed books have a finish date
    if book.status == "completed" and not book.date_finished:
        raise HTTPException(status_code=400, detail="Completed books require a finished date!")

    # Save to database
    new_book = BookModel(
        title=book.title,
        author=book.author,
        genre=book.genre,
        status=book.status,
        pages_read=book.pages_read,
        total_pages=book.total_pages or 0,  # Default to 0 if Open Library didn't have it
        rating=book.rating,
        date_started=book.date_started,
        date_finished=book.date_finished,
        owner_id=current_user.id
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)

    return JSONResponse(status_code=201, content={
        "message": f"'{book.title}' has been added to your vault!",
        "book_id": new_book.id
    })

@app.post("/book/{book_id}/upload-cover")
async def upload_cover(
    book_id: int = Path(..., gt=0, description="ID of the book"),
    file: UploadFile = File(..., description="Image file to upload (jpg, png, webp)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check book exists and belongs to this user
    book = db.query(BookModel).filter(
        BookModel.id == book_id,
        BookModel.owner_id == current_user.id
    ).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")

    # Only allow image files
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type! Only JPG, PNG, and WEBP are allowed."
        )

    # Generate a unique filename so files never overwrite each other
    # e.g. "a3f9c2d1-4b5e.jpg"
    extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{extension}"
    file_path = f"uploads/{unique_filename}"

    # Save the file to the uploads folder
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Save the public URL to the database
    cover_url = f"http://localhost:8000/covers/{unique_filename}"
    book.cover_image = cover_url
    db.commit()
    db.refresh(book)

    return JSONResponse(status_code=200, content={
        "message": "Cover image uploaded successfully!",
        "cover_image": cover_url
    })

# Path Parameters:
@app.get("/book/{book_id}")     # This endpoint will allow users to view a specific book by its ID using path parameters.")
def view_book(book_id: int = Path(..., description="ID of the book in the Database", example="1,2..." , gt=0), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    
    book = db.query(BookModel).filter(BookModel.id == book_id, BookModel.owner_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")
    return book

@app.get("/book_title/{book_title}")
def view_book_title(book_title: str = Path(..., description="Add the Title of the book in the Database", example="Fourth Wing"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(BookModel).filter(BookModel.title.ilike(f"%{book_title}%"), BookModel.owner_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=400, detail="Book title not found!")
    return book

@app.get("/book/{book_id}/progress")
def book_progress(
    book_id: int = Path(..., gt=0, description="ID of the book"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Fetch the book — make sure it belongs to this user
    book = db.query(BookModel).filter(
        BookModel.id == book_id,
        BookModel.owner_id == current_user.id
    ).first()

    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")

    # Calculate progress
    pages_left = book.total_pages - book.pages_read
    percentage = round((book.pages_read / book.total_pages) * 100, 2)

    # Friendly message based on progress
    if percentage == 0:
        message = "You haven't started this book yet. Let's go! 📖"
    elif percentage < 25:
        message = "Just getting started — keep going! 🌱"
    elif percentage < 50:
        message = "You're making good progress! 💪"
    elif percentage < 75:
        message = "More than halfway there! 🔥"
    elif percentage < 100:
        message = "Almost done — just a little more! 🏁"
    else:
        message = "You finished this book! 🎉"

    return {
        "title": book.title,
        "author": book.author,
        "status": book.status,
        "pages_read": book.pages_read,
        "total_pages": book.total_pages,
        "pages_left": pages_left,
        "percentage": percentage,
        "message": message
    }

# Query Parameters
@app.get("/sort")
def sort_books(sort_by: str = Query(..., description="Sort on the basis of 'total_pages'"), 
               order: str = Query("asc", description= "Sort in ascending or descending order"),
               db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)
            ):
    
    valid_fields = ["total_pages", "rating", "author", "genre"]

    if sort_by not in valid_fields:
        raise HTTPException(status_code=400, detail=f"Invalid field! Select from valid fields {valid_fields}")

    if order not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid order! Select between ascending and descending")
    
    column = getattr(BookModel, sort_by)
    if order == "desc":
        column = column.desc()

    books = db.query(BookModel).filter(BookModel.owner_id == current_user.id).order_by(column).all()
    return books

# Making an endpoint for the fields we entered in the class with the help of Pydantic model
# Making a POST (Create) endpoint to create a new book and add it to the JSON file. We will be using the Book class we created earlier to validate the incoming data and then we will add that data to the JSON file using the save_data function. We will also check if the book already exists in the JSON file before adding it to avoid duplicates.
@app.post("/create")
def create_book(book: Book, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(BookModel).filter(BookModel.title == book.title, BookModel.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book already exists!")
    
    # Creating new book
    new_book = BookModel(
        title=book.title,
        author=book.author,
        genre=book.genre,
        status=book.status,
        pages_read=book.pages_read,
        total_pages=book.total_pages,
        rating=book.rating,
        date_started=book.date_started,
        date_finished=book.date_finished,
        owner_id=current_user.id
    )
    db.add(new_book)
    db.commit()
    db.refresh(new_book)

    # Telling the client we have successfully conducted the creation process
    return JSONResponse(status_code=201, content={"message": "Book created successfully!"})

# Adding more endpoints
# Making a PUT (Update) endpoint to update the existing book's data in the JSON file. We will be using the Book class we created earlier to validate the incoming data and then we will update that data in the JSON file using the save_data function. We will also check if the book exists in the JSON file before updating it to avoid errors.
# First, a new Pydantic model will be made so that all the fields made this time become Optional instead of Required
# The new Pydantic model is made right below the first Pydantic model 
@app.put("/edit/{book_id}")
def update_book(book_id: int, book_update: BookUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(BookModel).filter(BookModel.id == book_id, BookModel.owner_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")
    
    updated_fields = book_update.model_dump(exclude_unset=True)
    for key, value in updated_fields.items():
        setattr(book, key, value)

    db.commit()
    db.refresh(book)
    return JSONResponse(status_code=200, content={"message": "Book updated successfully!"})

# Making a DELETE endpoint
@app.delete("/delete/{book_id}")
def delete_book(book_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    book = db.query(BookModel).filter(BookModel.id == book_id, BookModel.owner_id == current_user.id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")

    db.delete(book)
    db.commit()
    return JSONResponse(status_code=200, content={"message":"Book deleted successfully!"})


# Registering the router for authentication endpoints
app.include_router(auth_router)

# New Pydantic model for Author creation
class AuthorCreate(BaseModel):
    name: str

@app.post("/authors")
def create_author(author: AuthorCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(AuthorModel).filter(AuthorModel.name == author.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Author already exists!")
    new_author = AuthorModel(name=author.name)
    db.add(new_author)
    db.commit()
    db.refresh(new_author)
    return new_author

@app.get("/authors")
def get_authors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(AuthorModel).all()

@app.get("/authors/{author_id}/books")
def get_books_by_author(author_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    author = db.query(AuthorModel).filter(AuthorModel.id == author_id).first()
    if not author:
        raise HTTPException(status_code=404, detail="Author not found!")
    books = db.query(BookModel).filter(BookModel.author_id == author_id, BookModel.owner_id == current_user.id).all()
    return {"author": author.name, "books": books}