from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = "postgresql://vault_user:7822@localhost:5432/reading_vault"

# Creating the connection to PostgreSQL
engine = create_engine(DATABASE_URL)

# This is what we'll use to talk to the database in our endpoints
SessionLocal = sessionmaker(bind=engine)

# Base class — all the database table models will inherit from this
class Base(DeclarativeBase):
    pass

# This function will be used in every endpoint to open and close a DB session safely
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()