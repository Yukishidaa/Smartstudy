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

-- Таблица calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(120) NOT NULL CHECK (LENGTH(title) >= 1),
    description TEXT,
    location VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER NULL REFERENCES tasks(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_end_time_after_start CHECK (end_time > start_time),
    CONSTRAINT check_min_duration CHECK (EXTRACT(EPOCH FROM (end_time - start_time)) >= 300)
);

-- Теги для задач
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);


-- Индексы задач
CREATE INDEX IF NOT EXISTS idx_tasks_author_user_id ON tasks(author_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Индексы календаря
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start ON calendar_events(user_id, start_time);

-- Индексы тегов
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON task_tags(tag_id);