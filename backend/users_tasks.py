from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# Создание роутера
router = APIRouter()


# Модели данных
class UserCreate(BaseModel):
    nickname: str
    email: str
    password: str  # plain-text in, hashed before storage


class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None


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
@router.post("/users", status_code=201)
async def create_user(user: UserCreate, request: Request):
    from main import hash_password

    async with request.app.state.pool.acquire() as conn:
        # Check for duplicate email
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1", user.email
        )
        if existing:
            raise HTTPException(409, "Email already registered")

        row = await conn.fetchrow(
            """
            INSERT INTO users (nickname, email, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, nickname, email
            """,
            user.nickname,
            user.email,
            hash_password(user.password),
        )
        return dict(row)


@router.patch("/users/{user_id}")
async def update_user(user_id: int, user: UserUpdate, request: Request):
    from main import hash_password

    updates = []
    values = []

    if user.nickname is not None:
        updates.append(f"nickname = ${len(values)+1}")
        values.append(user.nickname)
    if user.email is not None:
        updates.append(f"email = ${len(values)+1}")
        values.append(user.email)
    if user.password is not None:
        updates.append(f"password_hash = ${len(values)+1}")
        values.append(hash_password(user.password))

    if not updates:
        raise HTTPException(400, "No fields to update")

    values.append(user_id)
    query = f"""
        UPDATE users
        SET {', '.join(updates)}
        WHERE id = ${len(values)}
        RETURNING id, nickname, email
    """

    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "User not found")
        return dict(row)


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, request: Request):
    async with request.app.state.pool.acquire() as conn:
        result = await conn.execute("DELETE FROM users WHERE id = $1", user_id)
        if result.split()[-1] == "0":
            raise HTTPException(404, "User not found")
        return {"message": f"User {user_id} deleted"}


# Задачи
@router.post("/tasks", status_code=201)
async def create_task(task: TaskCreate, request: Request):
    async with request.app.state.pool.acquire() as conn:
        user_exists = await conn.fetchval(
            "SELECT id FROM users WHERE id = $1", task.author_user_id
        )
        if not user_exists:
            raise HTTPException(404, "Author user not found")

        row = await conn.fetchrow(
            """
            INSERT INTO tasks (title, description, deadline, author_user_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, description, completed, created_at, deadline, completed_at, author_user_id
            """,
            task.title,
            task.description,
            task.deadline,
            task.author_user_id,
        )
        return dict(row)


@router.patch("/tasks/{task_id}")
async def update_task(task_id: int, task: TaskUpdate, request: Request):
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
            updates.append("completed_at = NOW()")
        else:
            updates.append("completed_at = NULL")
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

    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "Task not found")
        return dict(row)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: int, request: Request):
    async with request.app.state.pool.acquire() as conn:
        result = await conn.execute("DELETE FROM tasks WHERE id = $1", task_id)
        if result.split()[-1] == "0":
            raise HTTPException(404, "Task not found")
        return {"message": f"Task {task_id} deleted"}


@router.get("/tasks/")
async def get_tasks(
    request: Request,
    user_id: int = Query(...),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, description, completed, created_at, deadline, completed_at, author_user_id
            FROM tasks
            WHERE author_user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset,
        )

        total = await conn.fetchval(
            "SELECT COUNT(*) FROM tasks WHERE author_user_id = $1", user_id
        )

        # Для каждой задачи получаем теги
        tasks = []
        for row in rows:
            task = dict(row)
            tags = await conn.fetch(
                """
                SELECT t.id, t.name
                FROM tags t
                JOIN task_tags tt ON t.id = tt.tag_id
                WHERE tt.task_id = $1
                ORDER BY t.name
                """,
                task["id"]
            )
            task["tags"] = [dict(tag) for tag in tags]
            tasks.append(task)

        return {
            "tasks": tasks,
            "total": total,
            "limit": limit,
            "offset": offset,
        }


@router.get("/tasks/{task_id}")
async def get_task(
    task_id: int,
    request: Request,
    # current_user: int = Depends(get_current_user),  # потом раскомментировать
):
    async with request.app.state.pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, title, description, completed, created_at, deadline, completed_at, author_user_id
            FROM tasks
            WHERE id = $1
            """,
            task_id,
        )
        if not row:
            raise HTTPException(404, "Task not found")

        # Проверка: задача принадлежит пользователю (потом раскомментировать)
        # if row["author_user_id"] != current_user:
        #     raise HTTPException(403, "You can only view your own tasks")

        task = dict(row)

        # Получаем теги задачи
        tags = await conn.fetch(
            """
            SELECT t.id, t.name
            FROM tags t
            JOIN task_tags tt ON t.id = tt.tag_id
            WHERE tt.task_id = $1
            ORDER BY t.name
            """,
            task_id
        )
        task["tags"] = [dict(tag) for tag in tags]

        return task