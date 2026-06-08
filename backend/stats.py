from fastapi import APIRouter, HTTPException, Query, Request
from datetime import datetime, timedelta


router = APIRouter(prefix="/tasks/stats", tags=["stats"])


# Процент выполнения
@router.get("/completion")
async def get_completion_rate(
    request: Request,
    user_id: int = Query(...),
    period: str = Query("day", regex="^(day|week|month)$"),
):
    """
    Возвращает процент выполнения задач за период.
    period: day, week, month
    """
    now = datetime.now()
    if period == "day":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "week":
        start_date = now - timedelta(days=now.weekday())
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        raise HTTPException(400, "Invalid period. Use day, week, or month")

    async with request.app.state.pool.acquire() as conn:
        # Все задачи за период
        total = await conn.fetchval(
            """
            SELECT COUNT(*) FROM tasks
            WHERE author_user_id = $1 AND created_at >= $2
            """,
            user_id, start_date
        )

        # Завершённые задачи за период
        completed = await conn.fetchval(
            """
            SELECT COUNT(*) FROM tasks
            WHERE author_user_id = $1 
              AND created_at >= $2 
              AND completed = TRUE
            """,
            user_id, start_date
        )

        rate = (completed / total * 100) if total > 0 else 0

        return {
            "user_id": user_id,
            "period": period,
            "start_date": start_date.isoformat(),
            "total_tasks": total,
            "completed_tasks": completed,
            "completion_rate": round(rate, 2)
        }


# Просроченные задачи (долги)
@router.get("/debts")
async def get_debts(
    request: Request,
    user_id: int = Query(...),
):
    """
    Возвращает количество задач, у которых дедлайн прошёл,
    а флаг completed всё ещё false.
    """
    now = datetime.now()

    async with request.app.state.pool.acquire() as conn:
        # Просроченные задачи (дедлайн меньше текущего времени, не завершены)
        overdue = await conn.fetchval(
            """
            SELECT COUNT(*) FROM tasks
            WHERE author_user_id = $1
              AND deadline IS NOT NULL
              AND deadline < $2
              AND completed = FALSE
            """,
            user_id, now
        )

        # Все незавершённые задачи с дедлайном
        total_with_deadline = await conn.fetchval(
            """
            SELECT COUNT(*) FROM tasks
            WHERE author_user_id = $1
              AND deadline IS NOT NULL
              AND completed = FALSE
            """,
            user_id
        )

        return {
            "user_id": user_id,
            "overdue_tasks": overdue,
            "total_pending_with_deadline": total_with_deadline
        }


# Среднее время жизни задачи (опционально)
@router.get("/average-life")
async def get_average_life(
    request: Request,
    user_id: int = Query(...),
):
    """
    Возвращает среднее время от создания до завершения задачи (в часах).
    Учитываются только завершённые задачи.
    """
    async with request.app.state.pool.acquire() as conn:
        # Запрос для PostgreSQL
        row = await conn.fetchrow(
            """
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) as avg_hours
            FROM tasks
            WHERE author_user_id = $1
              AND completed = TRUE
              AND completed_at IS NOT NULL
            """,
            user_id
        )

        avg_hours = row["avg_hours"]
        
        if avg_hours is None:
            return {
                "user_id": user_id,
                "average_life_hours": None,
                "message": "No completed tasks found"
            }

        return {
            "user_id": user_id,
            "average_life_hours": round(avg_hours, 2),
            "average_life_days": round(avg_hours / 24, 2)
        }


# Пики продуктивности (по часам) — опционально
@router.get("/productivity-peaks")
async def get_productivity_peaks(
    request: Request,
    user_id: int = Query(...),
):
    """
    Возвращает часы, когда пользователь чаще всего завершает задачи.
    """
    async with request.app.state.pool.acquire() as conn:
        # Запрос по часам
        rows = await conn.fetch(
            """
            SELECT 
                EXTRACT(HOUR FROM completed_at) as hour,
                COUNT(*) as count
            FROM tasks
            WHERE author_user_id = $1
              AND completed = TRUE
              AND completed_at IS NOT NULL
            GROUP BY hour
            ORDER BY count DESC
            """,
            user_id
        )

        if not rows:
            return {
                "user_id": user_id,
                "message": "No completed tasks found"
            }

        peaks = [{"hour": int(row["hour"]), "count": row["count"]} for row in rows]
        
        # Определение времени суток
        for peak in peaks:
            hour = peak["hour"]
            if 5 <= hour < 12:
                peak["time_of_day"] = "morning"
            elif 12 <= hour < 18:
                peak["time_of_day"] = "afternoon"
            elif 18 <= hour < 23:
                peak["time_of_day"] = "evening"
            else:
                peak["time_of_day"] = "night"

        return {
            "user_id": user_id,
            "peaks": peaks,
            "most_productive_time": peaks[0]["time_of_day"] if peaks else None
        }