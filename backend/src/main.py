from fastapi import FastAPI
import asyncpg
from contextlib import asynccontextmanager
# from pydantic_settings import BaseSettings, SettingsConfigDict
from src.api import main_router
from src.settings import settings  # ← import the shared instance
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the lifecycle of the PostgreSQL connection pool.
    """
    try:
        # Create the connection pool on application startup
        app.state.db = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL
            # Add other asyncpg.create_pool parameters as needed, e.g., min_size, max_size
        )
        print("PostgreSQL connection pool created.")
        yield  # Application starts serving requests
    finally:
        # Close the connection pool on application shutdown
        if app.state.db:
            await app.state.db.close()
            print("PostgreSQL connection pool closed.")

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:5173",  # Assuming your frontend runs on port 3000
    "http://127.0.0.1",
    "http://127.0.0.1:5173", # Assuming your frontend runs on port 3000
    # Add the URL of your frontend when it's deployed (e.g., "https://your-frontend-domain.com")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)

app.include_router(main_router)
