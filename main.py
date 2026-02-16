# Importing libraries
from fastapi import FastAPI, Path
import json

app = FastAPI()

# Before making the endpoints we have to make a function to load the data in the books.json file because we will be using that data in the endpoints.
def load_data():
    with open("books.json", "r") as file:
        data = json.load(file)

    return data  

# Creating our endpoints
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
@app.get("/book/{book_id}")     # This endpoint will allow users to view a specific book by its ID using path parameters.")
def view_book(book_id: int = Path(..., description="ID of the book in the Database", example="1,2..." , gt=0)):
    # Loading all the books
    data = load_data()

    # Getting the actual list of books
    books_list = data.get("books", [])

    # Looping through to find the matching book ID
    for book in books_list:
        if book["id"] == book_id:
            return book
    return {'error':"Book not found!"}


@app.get("/book_title/{book_title}")
def view_book_title(book_title: str = Path(..., description="Add the Title of the book in the Database", example="Fourth Wing")):
    # Loading the data
    data = load_data()

    # Getting the list of the books
    books_list = data.get("books", [])

    for book in books_list:
        if book_title.lower() in book["title"].lower():
            return book
        
    return {'error': f"Book title: '{book_title}' not found"}
