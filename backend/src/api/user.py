from fastapi import APIRouter, Depends, HTTPException, status, Request
import asyncpg
from src.schemas.user import UserResponse, UserCreate
from passlib.context import CryptContext
from typing import List

router = APIRouter(
    tags=["Users"],
)
  
@router.get("/users", response_model=List[UserResponse])
async def get_users(req: Request):
    async with req.app.state.db.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM users")
        return [dict(row) for row in rows]
    
# Fetch a single user by name
@router.get("/users/{name}", response_model=UserResponse)
async def get_user_by_name(req: Request, name: str):
    async with req.app.state.db.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE name = $1", name)
        if row:
            return dict(row)
        raise HTTPException(status_code=404, detail="User not found")

# Add a new user
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(req: Request, user: UserCreate):
    async with req.app.state.db.acquire() as conn:
        # Hash the password
        password = pwd_context.hash(user.password)
        # Create new user
        try:
            row = await conn.fetchrow(
                "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
                user.name, user.email, password
            )
            return dict(row)
        except asyncpg.UniqueViolationError:
            raise HTTPException(status_code=400, detail="Email or name already exists")

# Update a user
@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(req: Request, user: UserResponse):
    async with req.app.state.db.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
            user.name, user.email, user.id
        )
        return dict(row)

# Delete a user by id
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(req: Request, user_id: int):
    async with req.app.state.db.acquire() as conn:
        result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted successfully"}
