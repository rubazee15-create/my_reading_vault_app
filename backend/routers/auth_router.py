from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from database import get_db
from models import User
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Auth"])


# --- Schemas ---
class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

# THE OVERALL FLOW:

# User signs up → /register
# User logs in  → /login → gets tokens
# Token expires → /refresh → gets new token silently
# App loads     → /me    → knows who is logged in


# --- Register ---
# Creating a new user account with the provided username, email, and password.The password is hashed before storing it in the database. 
# It is a sign up page where users can create an account by providing their username, email, and password. 
@router.post("/register", status_code=201)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully", "user_id": new_user.id}


# --- Login ---
# This endpoint verifies the user's credentials and returns two tokens: an access token for authentication and a refresh token for obtaining new access tokens when the current one expires.
@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}


# --- Refresh Token ---
# The access token expires after 30 mins
# This endpoint allows users to obtain a new access token using a valid refresh token. It verifies the refresh token and, if valid, issues a new access token and a new refresh token.
# It keeps the users staying loggind in without having to re-enter their credentials frequently, while also maintaining security by limiting the lifespan of access tokens.
@router.post("/refresh", response_model=TokenResponse)
def refresh_token(token: str, db: Session = Depends(get_db)):
    from jose import JWTError, jwt
    import os
    try:
        payload = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token({"sub": user.email})
    new_refresh_token = create_refresh_token({"sub": user.email})
    return {"access_token": new_access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}


# --- Me ---
# This endpoint returns the current authenticated user's information. It requires a valid access token and uses the get_current_user dependency to retrieve the user's details from the database.
# The frontend uses this to know who is logged in e.g. "Welcome, Ruba" or to load only that user's book. 
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "email": current_user.email}