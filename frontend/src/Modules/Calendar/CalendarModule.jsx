import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Plus, X, Check,
    Clock, MapPin, Tag
} from 'lucide-react';
import './CalendarModule.css';

// ============================================================
// Утилиты дат
// ============================================================

/** Получить все дни сетки месяца (включая «перетекающие» дни соседних месяцев) */
function getMonthGrid(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay  = new Date(year, month + 1, 0);
    // Понедельник = 0, воскресенье = 6
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days = [];
    for (let i = startOffset - 1; i >= 0; i--) {
        const d = new Date(year, month, -i);
        days.push({ date: d, current: false });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
        days.push({ date: new Date(year, month, d), current: true });
    }
    while (days.length % 7 !== 0) {
        const last = days[days.length - 1].date;
        days.push({ date: new Date(last.getTime() + 86400000), current: false });
    }
    return days;
}

/** Получить дни рабочей недели начиная с понедельника */
function getWeekDays(baseDate) {
    const d = new Date(baseDate);
    const day = (d.getDay() + 6) % 7; // 0=пн
    d.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
        const nd = new Date(d);
        nd.setDate(d.getDate() + i);
        return nd;
    });
}

/** isSameDay */
const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

/** Форматировать дату: "Пн, 30 апр" */
const fmtShort = (d) =>
    d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });

/** Форматировать только время */
const fmtTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const MONTH_NAMES = [
    'Январь','Февраль','Март','Апрель','Май','Июнь',
    'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
];
const WEEK_DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// ============================================================
// EventModal — создание / редактирование события календаря
// ============================================================
function EventModal({ event, defaultDate, onSave, onClose, theme }) {
    const isEdit = Boolean(event?.id);

    const toLocalInput = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const pad = n => String(n).padStart(2,'0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const defaultStart = defaultDate
        ? (() => { const d = new Date(defaultDate); d.setHours(10,0,0,0); return toLocalInput(d.toISOString()); })()
        : toLocalInput(new Date().toISOString());
    const defaultEnd = defaultDate
        ? (() => { const d = new Date(defaultDate); d.setHours(11,0,0,0); return toLocalInput(d.toISOString()); })()
        : '';

    const [title,    setTitle]    = useState(event?.title    ?? '');
    const [location, setLocation] = useState(event?.location ?? '');
    const [start,    setStart]    = useState(event ? toLocalInput(event.start) : defaultStart);
    const [end,      setEnd]      = useState(event ? toLocalInput(event.end)   : defaultEnd);
    const [errors,   setErrors]   = useState({});

    const validate = () => {
        const e = {};
        if (!title.trim())              e.title = 'Заголовок обязателен';
        if (title.trim().length > 120)  e.title = 'Максимум 120 символов';
        if (!start)                     e.start = 'Укажите время начала';
        if (!end)                       e.end   = 'Укажите время окончания';
        if (start && end && new Date(end) <= new Date(start))
            e.end = 'Время окончания должно быть позже начала';
        if (start && end) {
            const diff = (new Date(end) - new Date(start)) / 60000;
            if (diff < 5) e.end = 'Минимальная длительность события — 5 минут';
        }
        return e;
    };

    const handleSave = () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }
        // Сохраняем в UTC
        onSave({
            ...(event ?? {}),
            title: title.trim(),
            location: location.trim(),
            start: new Date(start).toISOString(),
            end:   new Date(end).toISOString(),
        });
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div
                className="cal-modal-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <motion.div
                    className={`cal-modal ${theme}`}
                    initial={{ opacity: 0, scale: 0.93, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    onClick={e => e.stopPropagation()}
                >
                    <div className="cal-modal-header">
                        <h3>{isEdit ? 'Редактировать событие' : 'Новое событие'}</h3>
                        <button className="cal-modal-close" onClick={onClose}><X size={17}/></button>
                    </div>
                    <div className="cal-modal-body">
                        {/* Заголовок */}
                        <div className="cal-field">
                            <label>Заголовок <span className="req">*</span></label>
                            <input
                                className={`cal-input ${errors.title ? 'error' : ''}`}
                                value={title}
                                onChange={e => { setTitle(e.target.value); setErrors(p=>({...p,title:''})); }}
                                placeholder="Название события (до 120 символов)"
                                maxLength={120}
                                autoFocus
                            />
                            {errors.title && <span className="cal-error">{errors.title}</span>}
                        </div>
                        {/* Место */}
                        <div className="cal-field">
                            <label><MapPin size={13}/> Место (необязательно)</label>
                            <input
                                className="cal-input"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Аудитория, онлайн и т.д."
                            />
                        </div>
                        {/* Время */}
                        <div className="cal-field-row">
                            <div className="cal-field">
                                <label><Clock size={13}/> Начало <span className="req">*</span></label>
                                <input
                                    type="datetime-local"
                                    className={`cal-input ${errors.start ? 'error' : ''}`}
                                    value={start}
                                    onChange={e => { setStart(e.target.value); setErrors(p=>({...p,start:'',end:''})); }}
                                />
                                {errors.start && <span className="cal-error">{errors.start}</span>}
                            </div>
                            <div className="cal-field">
                                <label><Clock size={13}/> Конец <span className="req">*</span></label>
                                <input
                                    type="datetime-local"
                                    className={`cal-input ${errors.end ? 'error' : ''}`}
                                    value={end}
                                    onChange={e => { setEnd(e.target.value); setErrors(p=>({...p,end:''})); }}
                                />
                                {errors.end && <span className="cal-error">{errors.end}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="cal-modal-footer">
                        <button className="cal-btn cancel" onClick={onClose}><X size={14}/> Отмена</button>
                        <button className="cal-btn save" onClick={handleSave}><Check size={14}/> {isEdit ? 'Сохранить' : 'Создать'}</button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================================
// TaskDetailPanel — боковая панель с деталями задачи/события
// ============================================================
function DetailPanel({ item, type, onClose, onEdit, theme }) {
    if (!item) return null;
    return (
        <motion.div
            className={`detail-panel ${theme}`}
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
        >
            <div className="detail-header">
                <h3 className="detail-title">{item.title}</h3>
                <button className="detail-close" onClick={onClose}><X size={17}/></button>
            </div>
            <div className="detail-body">
                {type === 'task' && (
                    <>
                        {item.description && <p className="detail-desc">{item.description}</p>}
                        <div className="detail-meta">
                            {(item.tags ?? [item.tag]).filter(Boolean).map(t => (
                                <span key={t} className="detail-tag"><Tag size={11}/> {t}</span>
                            ))}
                            {item.deadline && (
                                <span className="detail-deadline">
                                    <Clock size={11}/>
                                    {new Date(item.deadline).toLocaleString('ru-RU', {
                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            )}
                        </div>
                        <div className="detail-status">
                            Статус: <strong>{item.completed ? '✅ Выполнено' : '⏳ В работе'}</strong>
                        </div>
                        {item.completed_at && (
                            <div className="detail-time">
                                Выполнено: {new Date(item.completed_at).toLocaleString('ru-RU')}
                            </div>
                        )}
                        <div className="detail-time">
                            Создано: {new Date(item.created_at).toLocaleString('ru-RU')}
                        </div>
                    </>
                )}
                {type === 'event' && (
                    <>
                        {item.location && (
                            <div className="detail-location"><MapPin size={14}/> {item.location}</div>
                        )}
                        <div className="detail-time">
                            <Clock size={13}/>
                            {new Date(item.start).toLocaleString('ru-RU', {
                                day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit'
                            })} — {fmtTime(item.end)}
                        </div>
                    </>
                )}
            </div>
            {onEdit && (
                <div className="detail-footer">
                    <button className="cal-btn save" onClick={onEdit}>Редактировать</button>
                </div>
            )}
        </motion.div>
    );
}

// ============================================================
// CalendarModule — главный компонент
// ============================================================
/**
 * CalendarModule — сетка календаря с поддержкой drag-and-drop задач.
 *
 * Props:
 *  - theme   {'dark'|'light'}
 *  - tasks   {Array}  — список задач из WorkspaceModule (shared state)
 *  - onTaskUpdate {fn} — обновить задачу (установить deadline при drop)
 */
function CalendarModule({ theme = 'dark', tasks = [], onTaskUpdate }) {
    const today = new Date();

    // ---- Навигация ----
    const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDay, setSelectedDay] = useState(today);

    // ---- События календаря ----
    const [events, setEvents] = useState([
        {
            id: 1,
            title: 'Лекция по алгоритмам',
            location: 'Аудитория 305',
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0).toISOString(),
            end:   new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30).toISOString(),
        },
        {
            id: 2,
            title: 'Созвон с командой',
            location: 'Zoom',
            start: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 0).toISOString(),
            end:   new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 16, 0).toISOString(),
        },
    ]);
    const [nextEventId, setNextEventId] = useState(3);

    // ---- Модалки / детали ----
    const [eventModal, setEventModal]       = useState(null); // null | { mode: 'create'|'edit', event, defaultDate }
    const [detailItem, setDetailItem]       = useState(null); // { item, type: 'event'|'task' }

    // ---- Drag-and-drop ----
    const [draggingTask, setDraggingTask]   = useState(null);
    const [dragOverDay, setDragOverDay]     = useState(null);

    // ============================================================
    // Навигация
    // ============================================================
    const navigate = (dir) => {
        setCurrentDate(prev => {
            const d = new Date(prev);
            if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
            else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
            else d.setDate(d.getDate() + dir);
            return d;
        });
    };

    const headerLabel = () => {
        if (viewMode === 'month') return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        if (viewMode === 'week') {
            const days = getWeekDays(currentDate);
            return `${days[0].getDate()} — ${days[6].getDate()} ${MONTH_NAMES[days[6].getMonth()]} ${days[6].getFullYear()}`;
        }
        return currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    };

    // ============================================================
    // CRUD событий
    // ============================================================
    const handleSaveEvent = (data) => {
        if (data.id) {
            setEvents(prev => prev.map(e => e.id === data.id ? { ...e, ...data } : e));
        } else {
            setEvents(prev => [...prev, { ...data, id: nextEventId }]);
            setNextEventId(n => n + 1);
        }
    };

    const deleteEvent = (id) => {
        setEvents(prev => prev.filter(e => e.id !== id));
        setDetailItem(null);
    };

    // ============================================================
    // Drag-and-drop
    // ============================================================
    const handleDragStart = useCallback((task, e) => {
        setDraggingTask(task);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((date, e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverDay(date.toDateString());
    }, []);

    const handleDrop = useCallback((date, e) => {
        e.preventDefault();
        // Источник может быть двух видов:
        //  - локальный draggingTask (если событие началось внутри Calendar)
        //  - dataTransfer "task:{id}" (если задача из TodoList)
        let task = draggingTask;
        if (!task) {
            const raw = e.dataTransfer.getData('text/plain');
            if (raw && raw.startsWith('task:')) {
                const id = Number(raw.slice(5));
                task = tasks.find(t => t.id === id);
            }
        }
        if (!task) return;
        // Сохраняем время 09:00 целевого дня как новый дедлайн (UTC)
        const d = new Date(date);
        d.setHours(9, 0, 0, 0);
        onTaskUpdate({ ...task, deadline: d.toISOString() });
        setDraggingTask(null);
        setDragOverDay(null);
    }, [draggingTask, onTaskUpdate, tasks]);

    const handleDragLeave = () => setDragOverDay(null);
    const handleDragEnd   = () => { setDraggingTask(null); setDragOverDay(null); };

    // ============================================================
    // Получить события/задачи для конкретного дня
    // ============================================================
    const getEventsForDay = (date) =>
        events.filter(e => isSameDay(new Date(e.start), date));

    const getTasksForDay = (date) =>
        tasks.filter(t => t.deadline && isSameDay(new Date(t.deadline), date));

    // ============================================================
    // Рендер сетки месяца
    // ============================================================
    const renderMonthGrid = () => {
        const grid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
        return (
            <div className="cal-month-grid">
                {/* Заголовки дней */}
                {WEEK_DAYS_SHORT.map(d => (
                    <div key={d} className="cal-weekday-header">{d}</div>
                ))}
                {/* Ячейки */}
                {grid.map(({ date, current }, i) => {
                    const isToday  = isSameDay(date, today);
                    const isSel    = isSameDay(date, selectedDay);
                    const isDragOver = dragOverDay === date.toDateString();
                    const dayEvents = getEventsForDay(date);
                    const dayTasks  = getTasksForDay(date);

                    return (
                        <div
                            key={i}
                            className={[
                                'cal-day-cell',
                                !current   ? 'other-month' : '',
                                isToday    ? 'today'       : '',
                                isSel      ? 'selected'    : '',
                                isDragOver ? 'drag-over'   : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => setSelectedDay(date)}
                            onDragOver={e => handleDragOver(date, e)}
                            onDrop={e => handleDrop(date, e)}
                            onDragLeave={handleDragLeave}
                            onDoubleClick={() => setEventModal({ mode: 'create', defaultDate: date })}
                        >
                            <span className="cal-day-num">{date.getDate()}</span>

                            {/* Показываем до 3 событий, остальные — "+N" */}
                            <div className="cal-day-items">
                                {dayEvents.slice(0, 2).map(ev => (
                                    <div
                                        key={ev.id}
                                        className="cal-event-chip event"
                                        onClick={e => { e.stopPropagation(); setDetailItem({ item: ev, type: 'event' }); }}
                                        title={ev.title}
                                    >
                                        {fmtTime(ev.start)} {ev.title}
                                    </div>
                                ))}
                                {dayTasks.slice(0, 2 - Math.min(2, dayEvents.length)).map(t => (
                                    <div
                                        key={t.id}
                                        className={`cal-event-chip task ${t.completed ? 'done' : ''}`}
                                        onClick={e => { e.stopPropagation(); setDetailItem({ item: t, type: 'task' }); }}
                                        title={t.title}
                                    >
                                        <Tag size={9}/> {t.title}
                                    </div>
                                ))}
                                {(dayEvents.length + dayTasks.length) > 2 && (
                                    <div className="cal-more-badge">
                                        +{dayEvents.length + dayTasks.length - 2}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ============================================================
    // Рендер сетки недели
    // ============================================================
    const renderWeekGrid = () => {
        const days = getWeekDays(currentDate);
        return (
            <div className="cal-week-grid">
                {days.map((date, i) => {
                    const isToday    = isSameDay(date, today);
                    const isDragOver = dragOverDay === date.toDateString();
                    const dayEvents  = getEventsForDay(date);
                    const dayTasks   = getTasksForDay(date);

                    return (
                        <div
                            key={i}
                            className={['cal-week-col', isToday ? 'today' : '', isDragOver ? 'drag-over' : ''].filter(Boolean).join(' ')}
                            onDragOver={e => handleDragOver(date, e)}
                            onDrop={e => handleDrop(date, e)}
                            onDragLeave={handleDragLeave}
                            onDoubleClick={() => setEventModal({ mode: 'create', defaultDate: date })}
                        >
                            <div className="cal-week-col-header">
                                <span className="cal-week-dayname">{WEEK_DAYS_SHORT[i]}</span>
                                <span className={`cal-week-daynum ${isToday ? 'today-circle' : ''}`}>
                                    {date.getDate()}
                                </span>
                            </div>
                            <div className="cal-week-col-body">
                                {dayEvents.map(ev => (
                                    <div
                                        key={ev.id}
                                        className="cal-week-event event"
                                        onClick={() => setDetailItem({ item: ev, type: 'event' })}
                                    >
                                        <span className="cwe-time">{fmtTime(ev.start)}</span>
                                        <span className="cwe-title">{ev.title}</span>
                                    </div>
                                ))}
                                {dayTasks.map(t => (
                                    <div
                                        key={t.id}
                                        className={`cal-week-event task ${t.completed ? 'done' : ''}`}
                                        onClick={() => setDetailItem({ item: t, type: 'task' })}
                                    >
                                        <Tag size={10}/>
                                        <span className="cwe-title">{t.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // ============================================================
    // Рендер дня
    // ============================================================
    const renderDayView = () => {
        const dayEvents = getEventsForDay(currentDate);
        const dayTasks  = getTasksForDay(currentDate);
        return (
            <div className="cal-day-view">
                <div className="cal-day-view-header">
                    {currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                {dayEvents.length === 0 && dayTasks.length === 0 && (
                    <div className="cal-day-empty">
                        Событий нет. Дважды кликните, чтобы добавить.
                    </div>
                )}
                {dayEvents.map(ev => (
                    <div
                        key={ev.id}
                        className="cal-day-item event"
                        onClick={() => setDetailItem({ item: ev, type: 'event' })}
                    >
                        <div className="cdi-time">{fmtTime(ev.start)} – {fmtTime(ev.end)}</div>
                        <div className="cdi-title">{ev.title}</div>
                        {ev.location && <div className="cdi-loc"><MapPin size={12}/> {ev.location}</div>}
                    </div>
                ))}
                {dayTasks.map(t => (
                    <div
                        key={t.id}
                        className={`cal-day-item task ${t.completed ? 'done' : ''}`}
                        onClick={() => setDetailItem({ item: t, type: 'task' })}
                    >
                        <Tag size={12}/>
                        <div className="cdi-title">{t.title}</div>
                    </div>
                ))}
            </div>
        );
    };

    // ============================================================
    // Рендер
    // ============================================================
    return (
        <div className={`calendar-module ${theme}`}>

            {/* ---- Тулбар ---- */}
            <div className="cal-toolbar">
                {/* Навигация */}
                <div className="cal-nav">
                    <button className="cal-nav-btn" onClick={() => navigate(-1)}>
                        <ChevronLeft size={18}/>
                    </button>
                    <button
                        className="cal-today-btn"
                        onClick={() => { setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDay(today); }}
                    >
                        Сегодня
                    </button>
                    <button className="cal-nav-btn" onClick={() => navigate(1)}>
                        <ChevronRight size={18}/>
                    </button>
                    <span className="cal-header-label">{headerLabel()}</span>
                </div>

                {/* Переключатель вида */}
                <div className="cal-view-switch">
                    {['month','week','day'].map(v => (
                        <button
                            key={v}
                            className={`cal-view-btn ${viewMode === v ? 'active' : ''}`}
                            onClick={() => setViewMode(v)}
                        >
                            {{ month: 'Месяц', week: 'Неделя', day: 'День' }[v]}
                        </button>
                    ))}
                </div>

                {/* Кнопка создать событие */}
                <button
                    className="cal-add-btn"
                    onClick={() => setEventModal({ mode: 'create', defaultDate: selectedDay })}
                >
                    <Plus size={15}/> Событие
                </button>
            </div>

            {/* ---- Сетка ---- */}
            <div className="cal-body">
                {viewMode === 'month' && renderMonthGrid()}
                {viewMode === 'week'  && renderWeekGrid()}
                {viewMode === 'day'   && renderDayView()}
            </div>

            {/* ---- Детальная панель ---- */}
            <AnimatePresence>
                {detailItem && (
                    <DetailPanel
                        key="detail"
                        item={detailItem.item}
                        type={detailItem.type}
                        theme={theme}
                        onClose={() => setDetailItem(null)}
                        onEdit={detailItem.type === 'event'
                            ? () => { setEventModal({ mode: 'edit', event: detailItem.item }); setDetailItem(null); }
                            : null
                        }
                    />
                )}
            </AnimatePresence>

            {/* ---- Модалка события ---- */}
            <AnimatePresence>
                {eventModal && (
                    <EventModal
                        key="event-modal"
                        event={eventModal.mode === 'edit' ? eventModal.event : null}
                        defaultDate={eventModal.defaultDate}
                        onSave={handleSaveEvent}
                        onClose={() => setEventModal(null)}
                        theme={theme}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default CalendarModule;
