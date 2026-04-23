from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, status, Request
from fastapi.responses import RedirectResponse
# import asyncpg
import os
import json
import secrets
from urllib.parse import urlencode
import httpx
from src.settings import settings
from jose import jwt
from passlib.context import CryptContext

router = APIRouter(
    tags=["Auth"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

@router.get("/auth/google/login")
async def login():
    scopes = "openid email profile"
    state = "random_state_string_xyz"

    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": scopes,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    url = f"{settings.GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url)

@router.get("/auth/google/callback")
async def callback(request: Request, code: str, state: str):
    if state != "random_state_string_xyz":
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    async with httpx.AsyncClient() as client:
        # Exchange Code for Token
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        token_response = await client.post(settings.GOOGLE_TOKEN_URL, data=token_data)
        token_json = token_response.json()
        access_token = token_json.get("access_token")

        # Fetch User Info
        headers = {"Authorization": f"Bearer {access_token}"}
        user_info_response = await client.get(settings.GOOGLE_USERINFO_URL, headers=headers)
        user_data = user_info_response.json()

    email = user_data.get("email")
    name = user_data.get("name")

    if not email:
        raise HTTPException(status_code=400, detail="Email not provided by Google")

    async with request.app.state.db.acquire() as conn:
        # Check if user exists
        user = await conn.fetchrow("SELECT * FROM users WHERE email = $1", email)

        if not user:
            # Create user
            random_password = secrets.token_urlsafe(16)
            hashed_password = pwd_context.hash(random_password)

            # Create unique name if collision
            try:
                user = await conn.fetchrow(
                    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
                    name, email, hashed_password
                )
            except Exception:
                # Name collision likely
                name = f"{name}_{secrets.token_hex(4)}"
                user = await conn.fetchrow(
                    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
                    name, email, hashed_password
                )

    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        data={"sub": str(user['id']), "email": user['email']},
        expires_delta=access_token_expires
    )

    # Redirect back to the root (/) with the token attached
    redirect_url = f"/?token={token}&username={user['name']}&id={user['id']}"

    return RedirectResponse(url=redirect_url)
