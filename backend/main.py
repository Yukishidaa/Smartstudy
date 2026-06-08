import os
import asyncpg
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from dotenv import load_dotenv


from users_tasks import router as users_router
from calendar_routes import router as calendar_router
from stats import router as stats_router


load_dotenv()


app = FastAPI(title="Smart Study API", version="1.0.0")


# ── Password hashing ──────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── CORS ──────────────────────────────────────────────────────────────────────
frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:3001")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Database pool ─────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    app.state.pool = await asyncpg.create_pool(
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "password"),
        database=os.getenv("DB_NAME", "smart_study"),
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        min_size=2,
        max_size=10,
    )


@app.on_event("shutdown")
async def shutdown():
    await app.state.pool.close()


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(users_router)
app.include_router(calendar_router)
app.include_router(stats_router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    return {"message": "Smart Study API is running", "docs": "/docs"}


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/login")
async def login(body: LoginRequest, request: Request):
    async with request.app.state.pool.acquire() as conn:
        user = await conn.fetchrow(
            "SELECT id, nickname, email, password_hash FROM users WHERE email = $1",
            body.email,
        )
        if not user or not verify_password(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {"id": user["id"], "nickname": user["nickname"], "email": user["email"]}