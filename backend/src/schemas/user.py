from pydantic import BaseModel, EmailStr, constr

class UserBase(BaseModel):
    name: str = constr(min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = constr(min_length=8)

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True