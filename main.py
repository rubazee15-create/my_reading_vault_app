# Importing libraries
from fastapi import FastAPI
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



