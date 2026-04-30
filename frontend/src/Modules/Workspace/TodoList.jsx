import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Check, Tag, Pencil, Maximize2, GripVertical } from 'lucide-react';
import TaskModal from './TaskModal';
import './TodoList.css';

/**
 * TodoList — боковая панель со списком задач.
 *
 * Props (shared state приходит из WorkspaceModule):
 *  - theme            {'dark'|'light'}
 *  - tasks            {Array}        — список задач
 *  - onTasksChange    {fn(updater)}  — изменить tasks (как setTasks)
 *  - onTaskClick      {fn(task)}     — открыть деталь задачи
 *  - onOpenFullChat   {fn|undefined} — открыть полноэкранный чат
 *  - draggable        {boolean}      — поддерживать ли drag-and-drop задач
 */
function TodoList({
    theme,
    tasks,
    onTasksChange,
    onTaskClick,
    onOpenFullChat,
    draggable = true,
}) {
    // ---- Модалка создания/редактирования ----
    // undefined = закрыта, null = создание, объект = редактирование
    const [modalTask, setModalTask] = useState(undefined);
    const isModalOpen = modalTask !== undefined;

    // ---- Фильтр ----
    const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'done'

    // ========== Хелперы ==========

    /** Дедлайн прошёл и задача не выполнена */
    const isOverdue = (task) => {
        if (!task.deadline || task.completed) return false;
        return new Date(task.deadline) < new Date();
    };

    const total     = tasks.length;
    const done      = tasks.filter(t => t.completed).length;
    const debtCount = tasks.filter(isOverdue).length;
    const progress  = total > 0 ? Math.round((done / total) * 100) : 0;

    const filteredTasks = tasks.filter(t => {
        if (filter === 'active') return !t.completed;
        if (filter === 'done')   return t.completed;
        return true;
    });

    /** Все уникальные теги для подсказок в TaskModal */
    const allTags = [...new Set(tasks.flatMap(t => t.tags ?? []))];

    // ========== CRUD ==========

    const handleSaveTask = (data) => {
        if (data.id) {
            // Редактирование
            onTasksChange(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
        } else {
            // Создание
            const maxId  = tasks.reduce((m, t) => Math.max(m, t.id ?? 0), 0);
            const newTask = {
                ...data,
                id:           maxId + 1,
                completed:    false,
                created_at:   new Date().toISOString(),
                completed_at: null,
            };
            onTasksChange(prev => [newTask, ...prev]);
        }
    };

    /** Чекбокс — фиксируем completed_at */
    const toggleTask = (id, e) => {
        e?.stopPropagation();
        onTasksChange(prev => prev.map(t => {
            if (t.id !== id) return t;
            const nowDone = !t.completed;
            return {
                ...t,
                completed:    nowDone,
                completed_at: nowDone ? new Date().toISOString() : null,
            };
        }));
    };

    /** Удалить */
    const deleteTask = (id, e) => {
        e?.stopPropagation();
        onTasksChange(prev => prev.filter(t => t.id !== id));
    };

    // ========== Drag-and-drop ==========
    const handleDragStart = (task, e) => {
        // Передаём ID задачи через dataTransfer — потребитель (Calendar) считает по типу
        e.dataTransfer.setData('text/plain', `task:${task.id}`);
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <>
            <motion.div
                className={`todo-sidebar ${theme}`}
                initial={{ x: -340, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -340, opacity: 0 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
            >
                {/* ---- Заголовок ---- */}
                <div className="todo-header">
                    <h2 className="todo-title">Задачи</h2>
                    <div className="todo-header-actions">
                        {debtCount > 0 && (
                            <span className="debt-badge" title="Просроченные задачи">
                                {debtCount} долг{debtCount > 1 ? 'а' : ''}
                            </span>
                        )}
                        {onOpenFullChat && (
                            <button
                                className="todo-chat-btn"
                                onClick={onOpenFullChat}
                                title="Открыть ИИ-ассистент на весь экран"
                            >
                                <Maximize2 size={15} />
                            </button>
                        )}
                    </div>
                </div>

                {/* ---- Прогресс ---- */}
                <div className="progress-wrap">
                    <div className="progress-info">
                        <span>{done} / {total} выполнено</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="progress-bar-bg">
                        <motion.div
                            className="progress-bar-fill"
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>
                </div>

                {/* ---- Фильтры ---- */}
                <div className="todo-filters">
                    {[
                        { id: 'all',    label: 'Все'         },
                        { id: 'active', label: 'Активные'    },
                        { id: 'done',   label: 'Выполненные' },
                    ].map(f => (
                        <button
                            key={f.id}
                            className={`filter-btn ${filter === f.id ? 'active' : ''}`}
                            onClick={() => setFilter(f.id)}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* ---- Подсказка про DnD ---- */}
                {draggable && (
                    <div className="todo-dnd-hint">
                        Перетащите задачу в календарь, чтобы назначить дату
                    </div>
                )}

                {/* ---- Список задач ---- */}
                <ul className="task-list">
                    <AnimatePresence>
                        {filteredTasks.map(task => (
                            <motion.li
                                key={task.id}
                                className={`task-item ${task.completed ? 'done' : ''} ${isOverdue(task) ? 'overdue' : ''}`}
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -40 }}
                                transition={{ duration: 0.22 }}
                                layout
                                draggable={draggable}
                                onDragStart={draggable ? (e) => handleDragStart(task, e) : undefined}
                                onClick={() => onTaskClick && onTaskClick(task)}
                            >
                                {/* Drag-handle */}
                                {draggable && (
                                    <span className="task-drag-handle" title="Перетащить в календарь">
                                        <GripVertical size={13}/>
                                    </span>
                                )}

                                {/* Чекбокс */}
                                <button
                                    className={`task-check ${task.completed ? 'checked' : ''}`}
                                    onClick={(e) => toggleTask(task.id, e)}
                                    title={task.completed ? 'Снять отметку' : 'Отметить как выполненное'}
                                >
                                    {task.completed && <Check size={13} />}
                                </button>

                                {/* Тело */}
                                <div className="task-body">
                                    <span className="task-title-text">{task.title}</span>
                                    {task.description && (
                                        <span className="task-desc">{task.description}</span>
                                    )}
                                    <div className="task-meta">
                                        {(task.tags ?? [task.tag]).filter(Boolean).map(t => (
                                            <span key={t} className="task-tag">
                                                <Tag size={10} /> {t}
                                            </span>
                                        ))}
                                        {task.deadline && (
                                            <span className={`task-deadline ${isOverdue(task) ? 'late' : ''}`}>
                                                до {new Date(task.deadline).toLocaleDateString('ru-RU', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Кнопки действий */}
                                <div className="task-actions">
                                    <button
                                        className="task-action-btn edit"
                                        onClick={(e) => { e.stopPropagation(); setModalTask(task); }}
                                        title="Редактировать"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="task-action-btn delete"
                                        onClick={(e) => deleteTask(task.id, e)}
                                        title="Удалить"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </motion.li>
                        ))}
                    </AnimatePresence>

                    {filteredTasks.length === 0 && (
                        <li className="task-empty">Задач нет</li>
                    )}
                </ul>

                {/* ---- Кнопка добавления ---- */}
                <div className="todo-add-section">
                    <button
                        className="add-task-btn"
                        onClick={() => setModalTask(null)}
                    >
                        <Plus size={16} /> Добавить задачу
                    </button>
                </div>
            </motion.div>

            {/* ---- Модалка создания/редактирования ---- */}
            <AnimatePresence>
                {isModalOpen && (
                    <TaskModal
                        task={modalTask}
                        onSave={handleSaveTask}
                        onClose={() => setModalTask(undefined)}
                        allTags={allTags}
                        theme={theme}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default TodoList;
