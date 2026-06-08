from fastapi import APIRouter, HTTPException, Query, Request
from datetime import date, timedelta


router = APIRouter(prefix="/gamification", tags=["gamification"])


# ===== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ =====
async def update_streak(user_id: int, request: Request) -> dict:
    """
    Обновляет strike для пользователя.
    Вызывается при выполнении задачи.
    Возвращает текущий strike и рекорд.
    """
    today = date.today()
    
    async with request.app.state.pool.acquire() as conn:
        # Получаем текущие данные пользователя
        user = await conn.fetchrow(
            """
            SELECT current_streak, longest_streak, last_activity_date
            FROM users
            WHERE id = $1
            """,
            user_id
        )
        
        if not user:
            raise HTTPException(404, "User not found")
        
        current_streak = user["current_streak"] or 0
        longest_streak = user["longest_streak"] or 0
        last_activity = user["last_activity_date"]
        
        new_streak = current_streak
        message = "streak unchanged"
        
        # Если сегодня уже обновляли — ничего не делаем
        if last_activity == today:
            message = "already counted today"
        
        # Если вчера была активность — увеличиваем streak
        elif last_activity == today - timedelta(days=1):
            new_streak = current_streak + 1
            message = f"streak increased to {new_streak}"
        
        # Если активность была раньше чем вчера или нет активности — начинаем новую серию
        else:
            new_streak = 1
            message = "new streak started"
        
        # Обновляем рекорд
        new_longest = max(longest_streak, new_streak)
        
        # Сохраняем в БД
        await conn.execute(
            """
            UPDATE users
            SET current_streak = $1,
                longest_streak = $2,
                last_activity_date = $3
            WHERE id = $4
            """,
            new_streak, new_longest, today, user_id
        )
        
        return {
            "current_streak": new_streak,
            "longest_streak": new_longest,
            "last_activity_date": today.isoformat(),
            "message": message
        }


# ===== ЭНДПОИНТЫ =====

# Получить текущий strike пользователя
@router.get("/streak")
async def get_streak(
    request: Request,
    user_id: int = Query(...),  # ← фронтенд передаёт user_id
):
    """
    Возвращает текущий и максимальный strike пользователя.
    """
    async with request.app.state.pool.acquire() as conn:
        user = await conn.fetchrow(
            """
            SELECT current_streak, longest_streak, last_activity_date
            FROM users
            WHERE id = $1
            """,
            user_id
        )
        
        if not user:
            raise HTTPException(404, "User not found")
        
        return {
            "user_id": user_id,
            "current_streak": user["current_streak"] or 0,
            "longest_streak": user["longest_streak"] or 0,
            "last_activity_date": user["last_activity_date"].isoformat() if user["last_activity_date"] else None
        }


# Принудительно обновить strike (для тестирования)
@router.post("/streak/update")
async def force_update_streak(
    request: Request,
    user_id: int = Query(...),  # ← фронтенд передаёт user_id
):
    """
    Принудительно обновляет strike (полезно для тестирования).
    В обычном режиме strike обновляется автоматически при выполнении задачи.
    """
    result = await update_streak(user_id, request)
    return result