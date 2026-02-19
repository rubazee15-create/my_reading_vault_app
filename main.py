# Importing libraries
from fastapi import FastAPI, Path, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, computed_field
from typing import Annotated, Literal, Optional
import json

app = FastAPI()

# Making a class that will inheret the base model - Making a Pydantic model for creating new book in the database (JSON file)
class Book(BaseModel):
    # Building fields that are required to create a Book (e.g. refer to books.json fields) - with description and annotations
    id: Annotated[int, Field(..., description="Book ID", example=1)]
    title: Annotated[str, Field(..., description="Title of the book", example="Fourth Wing")]
    author: Annotated[str, Field(..., description="Author of the book", example="Rebecca Yarros")]
    genre: Annotated[str, Field(..., description="Genre of the book", example="Fantasy")]
    
    status: Annotated[Literal["completed", "not read", "reading"], Field(..., description="Reading status of the book")]
    
    pages_read: Annotated[int, Field(0, gte=0, description="Number of pages read of the book", example=544)]
    total_pages: Annotated[int, Field(..., gt=0, description="Total number of pages of the book", example=544)]
    
    # Optional fields 
    rating: Annotated[Optional[int], Field(default=None, gte=0, lte=5, description="Total rating of the book out of 5", examples=[4])]
    date_started: Annotated[Optional[str], Field(default=None, description="Starting date (DD-MM-YYY)", example="12-12-2025")]
    date_finished: Annotated[Optional[str], Field(default=None, description="Finsih date (DD-MM-YYY)", example="17-12-2025")]

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

# Second Pydantic model for PUT (Update) function
# Not passing ID as we are asking for it as a Path Parameter, so it will not be a part of the request body
class BookUpdate(BaseModel):
    title: Annotated[Optional [str], Field(default=None)]
    author: Annotated[Optional [str], Field(default=None)]
    genre: Annotated[Optional [str], Field(default=None)]
    
    status: Annotated[Optional [Literal["completed", "not read", "reading"]], Field(default=None)]
    
    pages_read: Annotated[Optional [int], Field(default=None)]
    total_pages: Annotated[Optional [int], Field(default=None)]
    
    # Optional fields 
    rating: Annotated[Optional[int], Field(default=None, gte=0, lte=5)]
    date_started: Annotated[Optional[str], Field(default=None, description="Starting date (DD-MM-YYY)")]
    date_finished: Annotated[Optional[str], Field(default=None, description="Finsih date (DD-MM-YYY)")]


# Before making the endpoints we have to make a function to load the data in the books.json file because we will be using that data in the endpoints.
def load_data():
    with open("books.json", "r") as file:
        data = json.load(file)

    return data  

# Saving the new book's data in the exisiting 'books.json' file 
def save_data(data):
    with open("books.json", "w") as file:
        json.dump(data, file, indent=4)

# Creating our endpoints - Staring with the basic ones and then moving to the more complex ones.
# Starting with GET (Retrieve) endpoints to view the data in the JSON file and then moving to POST endpoint to create a new book and add it to the JSON file.
@app.get("/")           # This endpoint will be the root endpoint of our API and will return a simple message to indicate that the API is working.
def hello():
    return {"message": "Reading Tracker API is up and running!"}

@app.get("/about")
def about():            # This endpoint will provide information about the API and its purpose.
    return {"message": "This is a fully functional API to track and manage your reading habits."}

@app.get("/view_books")
def view_books():       # This endpoint will allow users to view all the books they have added to their reading vault.
    # We will fetch the data using the load_data function and return all the books data as a response to the client.
    data = load_data()
    return data

# Including new operations to understand path parameters and query parameters in FastAPI.

# Path Parameters:
@app.get("/book/{book_id}")     # This endpoint will allow users to view a specific book by its ID using path parameters.")
def view_book(book_id: int = Path(..., description="ID of the book in the Database", example="1,2..." , gt=0)):
    # Loading all the books
    data = load_data()

    # Getting the actual dictionary of books
    books_dict = data.get("books", {})
    
    book = books_dict.get(str(book_id))
    if not book:
        raise HTTPException(status_code=404, detail="Book not found!")
    return book

@app.get("/book_title/{book_title}")
def view_book_title(book_title: str = Path(..., description="Add the Title of the book in the Database", example="Fourth Wing")):
    # Loading the data
    data = load_data()

    # Getting the dictionary of the books
    books_dict = data.get("books", {})

    for book in books_dict.values():
        if book_title.lower() in book["title"].lower():
            return book
        
    # return {'error': f"Book title: '{book_title}' not found"}
    # HTTP Exception with status code:
    raise HTTPException(status_code=404, detail="Book Title not found!")

# Query Parameters
@app.get("/sort")
def sort_books(sort_by: str = Query(..., description="Sort on the basis of 'total_pages'"), order: str = Query("asc", description= "Sort in ascending or descending order")):
    
    valid_fields = ["total_pages"]

    if sort_by not in valid_fields:
        raise HTTPException(status_code=400, detail=f"Invalid field! Select from valid fields {valid_fields}")

    if order not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid order! Select between ascending and descending")
    
    data = load_data()

    books_list = list(data.get("books", {}).values())

    sort_order = True if order =="desc" else False

    sorted_data = sorted(books_list, key=lambda x: x.get(sort_by, ""), reverse=sort_order)

    return sorted_data

# Making an endpoint for the fields we entered in the class with the help of Pydantic model
# Making a POST (Create) endpoint to create a new book and add it to the JSON file. We will be using the Book class we created earlier to validate the incoming data and then we will add that data to the JSON file using the save_data function. We will also check if the book already exists in the JSON file before adding it to avoid duplicates.
@app.post("/create")
def create_book(book: Book):
    # Loading the existing data
    data = load_data()
    book_id_str = str(book.id)

    # Checking if the book already exists 
    if book_id_str in data["books"]:
        raise HTTPException(status_code=400, detail="Book already exists in the Database")
    
    # Creating a new key 'book.id' - Adding new book to the exisiting Database
    # data[book.id] = book.model_dump(exclude={"id"})    # As all the content/values of each book are avaiable in the key 'id'.
    
    data["books"][book_id_str] = book.model_dump(exclude={"id"})
    data["metadata"]["total_books"] = len(data["books"])

    # Saving the new book's data in the JSON file 
    save_data(data)

    # Telling the client we have successfully conducted the creation process
    return JSONResponse(status_code=201, content={"message": "Book created successfully!"})

# Adding more endpoints
# Making a PUT (Update) endpoint to update the existing book's data in the JSON file. We will be using the Book class we created earlier to validate the incoming data and then we will update that data in the JSON file using the save_data function. We will also check if the book exists in the JSON file before updating it to avoid errors.
# First, a new Pydantic model will be made so that all the fields made this time become Optional instead of Required
# The new Pydantic model is made right below the first Pydantic model 
@app.put("/edit/{book_id}")
def update_book(book_id: int, book_update: BookUpdate):
    # Loading the data
    data = load_data()
    
    # Checking if the 'patient_id' exists in the existing data
    if book_id not in data:
        raise HTTPException (status_code=404, detail="Book not found!")
    
    # If the 'patient_id' is correct - e.g. 1 (then all the existing data of book having id 1 will be extracted)
    # Updating the values of status, pages_read and rating - for that we will have t convert 'book_update' which is a pydantic object into a dictionary
    existing_book_info = data(book_id)  # Contains all the fields 

    # Converting 'book_update' into a dictionary
    updated_book_info = book_update.model_dump(exclude_unset=True)   # By adding 'exclude_unset=True', rather than getting all the fields, we will only get the items we want i.e. status, pages_read and rating





