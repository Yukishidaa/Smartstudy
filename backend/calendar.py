from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
import asyncpg
import os


# Создание роутера
router = APIRouter(prefix="/calendar", tags=["calendar"])


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
class CalendarEventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    user_id: int
    task_id: Optional[int] = None

class CalendarEventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

class CalendarEventDrag(BaseModel):
    new_start_time: datetime
    new_end_time: datetime


# Вспомогательные функции
def validate_event_times(start_time: datetime, end_time: datetime):
    """Проверка времени события"""
    if end_time <= start_time:
        raise HTTPException(400, "end_time must be after start_time")
    
    duration_seconds = (end_time - start_time).total_seconds()
    if duration_seconds < 300:  # 5 минут = 300 секунд
        raise HTTPException(400, "Event must be at least 5 minutes long")

def validate_title(title: str):
    """Проверка заголовка"""
    if len(title) < 1 or len(title) > 120:
        raise HTTPException(400, "Title must be 1-120 characters")


# Эндпоинты
@router.post("/events")
async def create_event(event: CalendarEventCreate):
    """Создать событие"""
    validate_title(event.title)
    validate_event_times(event.start_time, event.end_time)
    
    conn = await get_db()
    try:
        # Проверяем, существует ли пользователь
        user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", event.user_id)
        if not user_exists:
            raise HTTPException(404, "User not found")
        
        # Проверяем task_id, если указан
        if event.task_id:
            task_exists = await conn.fetchval("SELECT id FROM tasks WHERE id = $1", event.task_id)
            if not task_exists:
                raise HTTPException(404, "Task not found")
        
        # Конвертируем в UTC (если пришло с timezone, PostgreSQL сам обработает)
        start_utc = event.start_time.astimezone(timezone.utc)
        end_utc = event.end_time.astimezone(timezone.utc)
        
        row = await conn.fetchrow(
            """
            INSERT INTO calendar_events (title, description, location, start_time, end_time, user_id, task_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, title, description, location, start_time, end_time, user_id, task_id, created_at
            """,
            event.title, event.description, event.location, start_utc, end_utc, event.user_id, event.task_id
        )
        return dict(row)
    finally:
        await conn.close()


@router.get("/events")
async def get_events(
    user_id: int = Query(...),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Получить события пользователя за период"""
    conn = await get_db()
    try:
        query = """
            SELECT id, title, description, location, start_time, end_time, user_id, task_id, created_at
            FROM calendar_events
            WHERE user_id = $1
        """
        params = [user_id]
        param_index = 2
        
        if start_date:
            query += f" AND start_time >= ${param_index}"
            params.append(start_date)
            param_index += 1
        if end_date:
            query += f" AND start_time <= ${param_index}"
            params.append(end_date)
            param_index += 1
        
        query += " ORDER BY start_time ASC LIMIT $" + str(param_index) + " OFFSET $" + str(param_index + 1)
        params.append(limit)
        params.append(offset)
        
        rows = await conn.fetch(query, *params)
        
        # Подсчёт общего количества
        count_query = """
            SELECT COUNT(*) FROM calendar_events
            WHERE user_id = $1
        """
        count_params = [user_id]
        count_index = 2
        if start_date:
            count_query += f" AND start_time >= ${count_index}"
            count_params.append(start_date)
            count_index += 1
        if end_date:
            count_query += f" AND start_time <= ${count_index}"
            count_params.append(end_date)
        
        total = await conn.fetchval(count_query, *count_params)
        
        return {
            "events": [dict(row) for row in rows],
            "total": total,
            "limit": limit,
            "offset": offset
        }
    finally:
        await conn.close()


@router.get("/events/{event_id}")
async def get_event(event_id: int):
    """Получить одно событие"""
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            """
            SELECT id, title, description, location, start_time, end_time, user_id, task_id, created_at
            FROM calendar_events
            WHERE id = $1
            """,
            event_id
        )
        if not row:
            raise HTTPException(404, "Event not found")
        return dict(row)
    finally:
        await conn.close()


@router.patch("/events/{event_id}")
async def update_event(event_id: int, event: CalendarEventUpdate):
    """Обновить событие"""
    updates = []
    values = []
    
    if event.title is not None:
        validate_title(event.title)
        updates.append(f"title = ${len(values)+1}")
        values.append(event.title)
    if event.description is not None:
        updates.append(f"description = ${len(values)+1}")
        values.append(event.description)
    if event.location is not None:
        updates.append(f"location = ${len(values)+1}")
        values.append(event.location)
    if event.start_time is not None:
        updates.append(f"start_time = ${len(values)+1}")
        values.append(event.start_time.astimezone(timezone.utc))
    if event.end_time is not None:
        updates.append(f"end_time = ${len(values)+1}")
        values.append(event.end_time.astimezone(timezone.utc))
    
    if not updates:
        raise HTTPException(400, "No fields to update")
    
    # Если обновляются времена — проверить их
    new_start = event.start_time if event.start_time else None
    new_end = event.end_time if event.end_time else None
    
    if new_start and new_end:
        validate_event_times(new_start, new_end)
    elif new_start or new_end:
        # Получить текущие времена из БД
        conn_check = await get_db()
        try:
            current = await conn_check.fetchrow(
                "SELECT start_time, end_time FROM calendar_events WHERE id = $1",
                event_id
            )
            if not current:
                raise HTTPException(404, "Event not found")
            start_check = new_start if new_start else current["start_time"]
            end_check = new_end if new_end else current["end_time"]
            validate_event_times(start_check, end_check)
        finally:
            await conn_check.close()
    
    values.append(event_id)
    query = f"""
        UPDATE calendar_events
        SET {', '.join(updates)}
        WHERE id = ${len(values)}
        RETURNING id, title, description, location, start_time, end_time, user_id, task_id, created_at
    """
    
    conn = await get_db()
    try:
        row = await conn.fetchrow(query, *values)
        if not row:
            raise HTTPException(404, "Event not found")
        return dict(row)
    finally:
        await conn.close()


@router.delete("/events/{event_id}")
async def delete_event(event_id: int):
    """Удалить событие"""
    conn = await get_db()
    try:
        result = await conn.execute("DELETE FROM calendar_events WHERE id = $1", event_id)
        if result.split()[-1] == '0':
            raise HTTPException(404, "Event not found")
        return {"message": f"Event {event_id} deleted"}
    finally:
        await conn.close()


@router.patch("/events/{event_id}/drag")
async def drag_event(event_id: int, drag: CalendarEventDrag):
    """Обновить время события (для drag-and-drop)"""
    validate_event_times(drag.new_start_time, drag.new_end_time)
    
    start_utc = drag.new_start_time.astimezone(timezone.utc)
    end_utc = drag.new_end_time.astimezone(timezone.utc)
    
    conn = await get_db()
    try:
        row = await conn.fetchrow(
            """
            UPDATE calendar_events
            SET start_time = $1, end_time = $2
            WHERE id = $3
            RETURNING id, title, description, location, start_time, end_time, user_id, task_id, created_at
            """,
            start_utc, end_utc, event_id
        )
        if not row:
            raise HTTPException(404, "Event not found")
        return dict(row)
    finally:
        await conn.close()


@router.post("/events/from-task/{task_id}")
async def create_event_from_task(task_id: int, user_id: int, start_time: datetime, end_time: datetime):
    """Создать событие из существующей задачи"""
    validate_event_times(start_time, end_time)
    
    conn = await get_db()
    try:
        # Получаем задачу
        task = await conn.fetchrow(
            "SELECT title, description FROM tasks WHERE id = $1 AND author_user_id = $2",
            task_id, user_id
        )
        if not task:
            raise HTTPException(404, "Task not found or not owned by user")
        
        # Создаём событие
        start_utc = start_time.astimezone(timezone.utc)
        end_utc = end_time.astimezone(timezone.utc)
        
        row = await conn.fetchrow(
            """
            INSERT INTO calendar_events (title, description, start_time, end_time, user_id, task_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, title, description, location, start_time, end_time, user_id, task_id, created_at
            """,
            task["title"], task["description"], start_utc, end_utc, user_id, task_id
        )
        return dict(row)
    finally:
        await conn.close()