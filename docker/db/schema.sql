-- Таблица users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    version BIGINT DEFAULT 1,
    nickname VARCHAR(50) NOT NULL CHECK (LENGTH(nickname) > 6),
    email VARCHAR(254) NOT NULL CHECK (LENGTH(email) > 6) UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- Таблица tasks
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    version BIGINT DEFAULT 1,
    title VARCHAR(100) NOT NULL CHECK (LENGTH(title) > 1),
    description VARCHAR(1000) CHECK (LENGTH(description) > 1),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    author_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_tasks_author_user_id ON tasks(author_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);