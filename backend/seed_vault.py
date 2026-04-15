from database import SessionLocal
from models import User, Book

def seed_data():
    db = SessionLocal()
    try:
        # Check if user already exists
        user = db.query(User).filter(User.username == "ruba_dev").first()
        
        if not user:
            user = User(username="ruba_dev", email="test@example.com", password_hash="hash")
            db.add(user)
            db.commit()
            db.refresh(user)
            print("Created new user.")
        else:
            print("User already exists, skipping user creation.")

        # Add the book anyway (or check if book exists too)
        new_book = Book(
            title="The Alchemist",
            author="Paulo Coelho",
            genre="Fiction",
            status="reading",
            total_pages=208,
            owner_id=user.id
        )
        db.add(new_book)
        db.commit()
        print(f"✅ Added '{new_book.title}' to {user.username}'s vault!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()