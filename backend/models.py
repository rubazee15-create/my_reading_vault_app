from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    books = relationship("Book", back_populates="owner")

# Making a Pydantic model for the Book table in the database.
class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    author = Column(String, nullable=False)
    genre = Column(String, nullable=False)
    status = Column(String, nullable=False)  # "completed", "reading", "not read"
    pages_read = Column(Integer, default=0)
    total_pages = Column(Integer, nullable=False)
    rating = Column(Integer, nullable=True)
    date_started = Column(String, nullable=True)
    date_finished = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="books")