print("1. Script starting...")
from database import SessionLocal
from models import User, Book, Author
print("2. Imports successful...")

def seed_data():
    print("3. Inside seed_data function...")
    db = SessionLocal()
    try:
        print("4. Attempting to query user...")
        user = db.query(User).filter(User.username == "ruba_dev").first()
        
        if not user:
            print("5. Creating new user...")
            user = User(username="ruba_dev", email="test@example.com", password_hash="hash")
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Get or create Author
        print("6. Checking for author...")
        author_name = "Paulo Coelho"
        author = db.query(Author).filter(Author.name == author_name).first()
        if not author:
            author = Author(name=author_name)
            db.add(author)
            db.commit()
            db.refresh(author)

        print("7. Adding book...")
        new_book = Book(
            title="The Alchemist",
            genre="Fiction",
            status="reading",
            total_pages=208,
            owner_id=user.id,
            author_id=author.id  # This uses the new relationship!
        )
        db.add(new_book)
        db.commit()
        print(f"✅ SUCCESS: Added {new_book.title}")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        db.rollback()
    finally:
        db.close()
        print("8. Database connection closed.")

if __name__ == "__main__":
    seed_data()