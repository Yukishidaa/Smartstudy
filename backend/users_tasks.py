from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import asyncpg
import os


# Создание роутера
router = APIRouter()


# Подключение к БД
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "smart_study")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"


async def get_db():
    return await asyncpg.connect(DATABASE_URL)


# Модели данных
class UserCreate(BaseModel):
    nickname: str
    email: str
    password_hash: str

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    email: Optional[str] = None
    password_hash: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    author_user_id: int

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    deadline: Optional[datetime] = None


# Пользователи
@router.post("/users")
async def create_user(user: UserCreate):
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO users (nickname, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, nickname, email
            """,
            user.nickname, user.email, user.password_hash
        )
        return dict(row)
    finally:
        await conn.close()


@router.patch("/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate):
    updates = []
    values = []
    
    if user.nickname is not None:
        updates.append(f"nickname = ${len(values)+1}")
        values.append(user.nickname)
    if user.email is not None:
        updates.append(f"email = ${len(values)+1}")
        values.append(user.email)
    if user.password_hash is not None:
        updates.append(f"password_hash = ${len(values)+1}")
        values.append(user.password_hash)
    
    if not updates:
        raise HTTPException(400, "No fields to update")
    
    values.append(user_id)
    query = f"""
        UPDATE users 
        SET {', '.join(updates)}
        WHERE id = ${len(values)}
        RETURNING id, nickname, email
    """
    
    conn = await get_db()
    try:
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "User not found")
        return dict(row)
    finally:
        await conn.close()


@router.delete("/users/{user_id}")
async def delete_user(user_id: int):
    conn = await get_db()
    try:
        result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        if result.split()[-1] == '0':
            raise HTTPException(404, "User not found")
        return {"message": f"User {user_id} deleted"}
    finally:
        await conn.close()


# Задачи
@router.post("/tasks")
async def create_task(task: TaskCreate):
    conn = await get_db()
    try:
        user_exists = await conn.fetchval(
            "SELECT id FROM users WHERE id = $1", task.author_user_id
        )
        if not user_exists:
            raise HTTPException(404, "Author user not found")
        
        row = await conn.fetchrow(
            """
            INSERT INTO tasks (title, description, deadline, author_user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, description, completed, created_at, deadline, author_user_id
            """,
            task.title, task.description, task.deadline, task.author_user_id
        )
        return dict(row)
    finally:
        await conn.close()


@router.patch("/tasks/{task_id}")
async def update_task(task_id: int, task: TaskUpdate):
    updates = []
    values = []
    
    if task.title is not None:
        updates.append(f"title = ${len(values)+1}")
        values.append(task.title)
    if task.description is not None:
        updates.append(f"description = ${len(values)+1}")
        values.append(task.description)
    if task.completed is not None:
        updates.append(f"completed = ${len(values)+1}")
        values.append(task.completed)
        if task.completed:
            updates.append(f"completed_at = NOW()")
    if task.deadline is not None:
        updates.append(f"deadline = ${len(values)+1}")
        values.append(task.deadline)
    
    if not updates:
        raise HTTPException(400, "No fields to update")
    
    values.append(task_id)
    query = f"""
        UPDATE tasks
        SET {', '.join(updates)}
        WHERE id = ${len(values)}
        RETURNING id, title, description, completed, created_at, deadline, completed_at, author_user_id
    """
    
    conn = await get_db()
    try:
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "Task not found")
        return dict(row)
    finally:
        await conn.close()


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int):
    conn = await get_db()
    try:
        result = await conn.execute("DELETE FROM tasks WHERE id = $1", task_id)
        if result.split()[-1] == '0':
            raise HTTPException(404, "Task not found")
        return {"message": f"Task {task_id} deleted"}
    finally:
        await conn.close()


@router.get("/tasks/")
async def get_tasks(
    user_id: int = Query(...),
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    conn = await get_db()
    try:
        rows = await conn.fetch(
            """
            SELECT id, title, description, completed, created_at, deadline, completed_at, author_user_id
            FROM tasks
            WHERE author_user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset
        )
        
        total = await conn.fetchval(
            "SELECT COUNT(*) FROM tasks WHERE author_user_id = $1",
            user_id
        )
        
        return {
            "tasks": [dict(row) for row in rows],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    finally:
        await conn.close()


@router.get("/tasks/{task_id}")
async def get_task(task_id: int):
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            """
            SELECT id, title, description, completed, created_at, deadline, completed_at, author_user_id
            FROM tasks
            WHERE id = $1
            """,
            task_id
        )
        if not row:
            raise HTTPException(404, "Task not found")
        return dict(row)
    finally:
        await conn.close()