from fastapi import APIRouter, HTTPException, Query, Request, Depends
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Временно без JWT, current_user пока не используем
# Позже добавишь: from auth import get_current_user

router = APIRouter(prefix="/tags", tags=["tags"])


# Модели данных
class TagCreate(BaseModel):
    name: str


class TagResponse(BaseModel):
    id: int
    name: str
    created_at: datetime


# ===== ЭНДПОИНТЫ =====

# Создать тег
@router.post("/", status_code=201)
async def create_tag(
    tag: TagCreate,
    request: Request,
    # current_user: int = Depends(get_current_user),  # добавить после JWT
):
    # user_id = current_user  # временно замени на 1 или передавай из запроса
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        # Проверка на дубликат
        existing = await conn.fetchval(
            "SELECT id FROM tags WHERE user_id = $1 AND name = $2",
            user_id, tag.name
        )
        if existing:
            raise HTTPException(409, "Tag with this name already exists")
        
        row = await conn.fetchrow(
            """
            INSERT INTO tags (name, user_id)
            VALUES ($1, $2)
            RETURNING id, name, created_at
            """,
            tag.name, user_id
        )
        return dict(row)


# Получить все теги пользователя
@router.get("/")
async def get_tags(
    request: Request,
    # current_user: int = Depends(get_current_user),
):
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, name, created_at
            FROM tags
            WHERE user_id = $1
            ORDER BY name
            """,
            user_id
        )
        return {"tags": [dict(row) for row in rows]}


# Удалить тег
@router.delete("/{tag_id}")
async def delete_tag(
    tag_id: int,
    request: Request,
    # current_user: int = Depends(get_current_user),
):
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        # Проверка, что тег принадлежит пользователю
        tag_owner = await conn.fetchval(
            "SELECT user_id FROM tags WHERE id = $1", tag_id
        )
        if not tag_owner:
            raise HTTPException(404, "Tag not found")
        if tag_owner != user_id:
            raise HTTPException(403, "You can only delete your own tags")
        
        result = await conn.execute("DELETE FROM tags WHERE id = $1", tag_id)
        if result.split()[-1] == "0":
            raise HTTPException(404, "Tag not found")
        return {"message": f"Tag {tag_id} deleted"}


# Добавить тег к задаче
@router.post("/tasks/{task_id}/tags", status_code=201)
async def add_tag_to_task(
    task_id: int,
    request: Request,
    tag_id: int = Query(...),
    # current_user: int = Depends(get_current_user),
):
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        # Проверка: задача принадлежит пользователю
        task_owner = await conn.fetchval(
            "SELECT author_user_id FROM tasks WHERE id = $1", task_id
        )
        if not task_owner:
            raise HTTPException(404, "Task not found")
        if task_owner != user_id:
            raise HTTPException(403, "You can only add tags to your own tasks")
        
        # Проверка: тег принадлежит пользователю
        tag_owner = await conn.fetchval(
            "SELECT user_id FROM tags WHERE id = $1", tag_id
        )
        if not tag_owner:
            raise HTTPException(404, "Tag not found")
        if tag_owner != user_id:
            raise HTTPException(403, "You can only use your own tags")
        
        # Проверка: не добавлять уже существующую связь
        existing = await conn.fetchval(
            "SELECT 1 FROM task_tags WHERE task_id = $1 AND tag_id = $2",
            task_id, tag_id
        )
        if existing:
            raise HTTPException(409, "Tag already assigned to this task")
        
        await conn.execute(
            "INSERT INTO task_tags (task_id, tag_id) VALUES ($1, $2)",
            task_id, tag_id
        )
        return {"message": f"Tag {tag_id} added to task {task_id}"}


# Удалить тег у задачи
@router.delete("/tasks/{task_id}/tags/{tag_id}")
async def remove_tag_from_task(
    task_id: int,
    tag_id: int,
    request: Request,
    # current_user: int = Depends(get_current_user),
):
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        # Проверка: задача принадлежит пользователю
        task_owner = await conn.fetchval(
            "SELECT author_user_id FROM tasks WHERE id = $1", task_id
        )
        if not task_owner:
            raise HTTPException(404, "Task not found")
        if task_owner != user_id:
            raise HTTPException(403, "You can only remove tags from your own tasks")
        
        result = await conn.execute(
            "DELETE FROM task_tags WHERE task_id = $1 AND tag_id = $2",
            task_id, tag_id
        )
        if result.split()[-1] == "0":
            raise HTTPException(404, "Tag not found on this task")
        return {"message": f"Tag {tag_id} removed from task {task_id}"}


# Получить все теги задачи
@router.get("/tasks/{task_id}/tags")
async def get_task_tags(
    task_id: int,
    request: Request,
    # current_user: int = Depends(get_current_user),
):
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        # Проверка: задача принадлежит пользователю
        task_owner = await conn.fetchval(
            "SELECT author_user_id FROM tasks WHERE id = $1", task_id
        )
        if not task_owner:
            raise HTTPException(404, "Task not found")
        if task_owner != user_id:
            raise HTTPException(403, "You can only view tags of your own tasks")
        
        rows = await conn.fetch(
            """
            SELECT t.id, t.name, t.created_at
            FROM tags t
            JOIN task_tags tt ON t.id = tt.tag_id
            WHERE tt.task_id = $1
            ORDER BY t.name
            """,
            task_id
        )
        return {"tags": [dict(row) for row in rows]}


# Получить все задачи по тегу
@router.get("/by-tag/{tag_id}")
async def get_tasks_by_tag(
    tag_id: int,
    request: Request,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    # current_user: int = Depends(get_current_user),
):
    user_id = 1
    
    async with request.app.state.pool.acquire() as conn:
        # Проверка: тег принадлежит пользователю
        tag_owner = await conn.fetchval(
            "SELECT user_id FROM tags WHERE id = $1", tag_id
        )
        if not tag_owner:
            raise HTTPException(404, "Tag not found")
        if tag_owner != user_id:
            raise HTTPException(403, "You can only view tasks with your own tags")
        
        rows = await conn.fetch(
            """
            SELECT t.id, t.title, t.description, t.completed, t.created_at, 
                   t.deadline, t.completed_at, t.author_user_id
            FROM tasks t
            JOIN task_tags tt ON t.id = tt.task_id
            WHERE tt.tag_id = $1 AND t.author_user_id = $2
            ORDER BY t.created_at DESC
            LIMIT $3 OFFSET $4
            """,
            tag_id, user_id, limit, offset
        )
        
        total = await conn.fetchval(
            """
            SELECT COUNT(*)
            FROM tasks t
            JOIN task_tags tt ON t.id = tt.task_id
            WHERE tt.tag_id = $1 AND t.author_user_id = $2
            """,
            tag_id, user_id
        )
        
        return {
            "tasks": [dict(row) for row in rows],
            "total": total,
            "limit": limit,
            "offset": offset
        }