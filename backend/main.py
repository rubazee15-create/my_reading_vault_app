# Importing libraries
from fastapi import FastAPI, Path, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, computed_field, model_validator
from typing import Annotated, Literal, Optional
from datetime import date
from sqlalchemy.orm import Session
from database import get_db
from models import Book as BookModel
import json

app = FastAPI()

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
    id: Annotated[int, Field(..., description="Book ID", example=1)]
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
def view_books(db: Session = Depends(get_db)):  # This endpoint will allow users to view all the books they have added to their reading vault.
    books = db.query(BookModel).all()
    return books

# Including new operations to understand path parameters and query parameters in FastAPI.

# Path Parameters:
@app.get("/book/{book_id}")     # This endpoint will allow users to view a specific book by its ID using path parameters.")
def view_book(book_id: int = Path(..., description="ID of the book in the Database", example="1,2..." , gt=0), db: Session = Depends(get_db)):
    
    book = db.query(BookModel).filter(BookModel.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")
    return book

@app.get("/book_title/{book_title}")
def view_book_title(book_title: str = Path(..., description="Add the Title of the book in the Database", example="Fourth Wing"), db: Session = Depends(get_db)):
    book = db.query(BookModel).filter(BookModel.title.ilike(f"%{book_title}%")).first()
    if not book:
        raise HTTPException(status_code=400, detail="Book title not found!")
    return book

# Query Parameters
@app.get("/sort")
def sort_books(sort_by: str = Query(..., description="Sort on the basis of 'total_pages'"), 
               order: str = Query("asc", description= "Sort in ascending or descending order"),
               db: Session = Depends(get_db)
               ):
    
    valid_fields = ["total_pages", "rating", "author", "genre"]

    if sort_by not in valid_fields:
        raise HTTPException(status_code=400, detail=f"Invalid field! Select from valid fields {valid_fields}")

    if order not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid order! Select between ascending and descending")
    
    column = getattr(BookModel, sort_by)
    if order == "desc":
        column = column.desc()

    books = db.query(BookModel).order_by(column).all()
    return books

# Making an endpoint for the fields we entered in the class with the help of Pydantic model
# Making a POST (Create) endpoint to create a new book and add it to the JSON file. We will be using the Book class we created earlier to validate the incoming data and then we will add that data to the JSON file using the save_data function. We will also check if the book already exists in the JSON file before adding it to avoid duplicates.
@app.post("/create")
def create_book(book: Book, db: Session = Depends(get_db)):
    existing = db.query(BookModel).filter(BookModel.id == book.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Book already exists!")
    
    # Creating new book
    new_book = BookModel(
        id=book.id,
        title=book.title,
        author=book.author,
        genre=book.genre,
        status=book.status,
        pages_read=book.pages_read,
        total_pages=book.total_pages,
        rating=book.rating,
        date_started=book.date_started,
        date_finished=book.date_finished
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
def update_book(book_id: int, book_update: BookUpdate, db: Session = Depends(get_db)):
    book = db.query(BookModel).filter(BookModel.id == book_id).first()
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
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.query(BookModel).filter(BookModel.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")

    db.delete(book)
    db.commit()
    return JSONResponse(status_code=200, content={"message":"Book deleted successfully!"})



