from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from dotenv import load_dotenv
import os 

# Loading environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Creating the connection to PostgreSQL
engine = create_engine(DATABASE_URL)

# This is what will be used to talk to the database in the endpoints in the 'main.py' file
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