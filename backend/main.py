from fastapi import FastAPI
from backend.users_tasks import router as users_router
from backend.calendar import router as calendar_router


app = FastAPI(title="Smart Study API", version="1.0.0")


# Подключаем роутеры
app.include_router(users_router)
app.include_router(calendar_router)


@app.get("/")
async def root():
    return {"message": "Smart Study API is running", "docs": "/docs"}