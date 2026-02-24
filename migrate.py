# Migrating the manually made 'books.json' file to the new database using SQLAlchemy and the Book model defined in models.py
import json
from database import SessionLocal
from models import Book

# Loading the existing 'books.json'
with open("books.json", "r") as f:
    data = json.load(f)

db = SessionLocal()

for book_id, book in data["books"].items():
    new_book = Book(
        id=int(book_id),
        title=book["title"],
        author=book["author"],
        genre=book["genre"],
        status=book["status"],
        pages_read=book.get("pages_read", 0),
        total_pages=book["total_pages"],
        rating=book.get("rating"),
        date_started=book.get("date_started"),
        date_finished=book.get("date_finished")
    )
    db.add(new_book)

db.commit()
db.close()
print("All books migrated successfully!")