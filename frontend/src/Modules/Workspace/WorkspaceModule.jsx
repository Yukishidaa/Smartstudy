import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import Sidebar from './Sidebar';
import TodoList from './TodoList';
import TaskModal from './TaskModal';
import AIChatPanel from '../Chat/AIChatPanel';
import CalendarModule from '../Calendar/CalendarModule';
import AnimatedBg from '../../components/AnimatedBg';
import './WorkspaceModule.css';

/**
 * WorkspaceModule — корневой компонент рабочего пространства SmartStudy.
 *
 * Управляет глобальным состоянием:
 *  - activePage: 'home' | 'todo' | 'calendar' | 'chat'
 *  - тема, сворачивание sidebar
 *  - tasks (shared между Todo и Calendar)
 *  - chatMessages (история чата живёт здесь — не сбрасывается при переходах)
 *  - chatCollapsed (свёрнутость правой панели)
 *  - taskDetail (выбранная задача для просмотра)
 *
 * Логика чата (по prompt.txt):
 *  - activePage === 'chat'  → AIChatPanel mode='center' (центр экрана, как Gemini)
 *  - другие страницы (todo / calendar) → mode='sidebar' (компактная справа)
 *  - на 'home' чат скрыт
 *  - история сообщений хранится здесь же → при переходах не пропадает
 */

// ---- Начальный набор задач (синхронизирован между Todo и Calendar) ----
const INITIAL_TASKS = [
    {
        id: 1,
        title: 'Сдать лабораторную по матану',
        description: 'Задачи 1-15 из раздела интегралов',
        tags: ['Учёба', 'Срочно'],
        tag:  'Учёба',
        deadline: '2025-05-01T18:00',
        completed: false,
        created_at:  new Date('2025-04-28').toISOString(),
        completed_at: null,
    },
    {
        id: 2,
        title: 'Прочитать главу 3 по алгоритмам',
        description: '',
        tags: ['Учёба'],
        tag:  'Учёба',
        deadline: '2025-05-03T23:59',
        completed: true,
        created_at:  new Date('2025-04-27').toISOString(),
        completed_at: new Date('2025-04-29').toISOString(),
    },
    {
        id: 3,
        title: 'Написать тесты для бэкенда',
        description: 'Покрыть эндпоинты регистрации и авторизации',
        tags: ['Разработка'],
        tag:  'Разработка',
        deadline: null,
        completed: false,
        created_at: new Date('2025-04-30').toISOString(),
        completed_at: null,
    },
];

function WorkspaceModule() {
    // ---- Навигация ----
    const [activePage, setActivePage]     = useState('home');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    // ---- Тема ----
    const [theme, setTheme] = useState('dark');

    // ---- Shared state: задачи ----
    const [tasks, setTasks] = useState(INITIAL_TASKS);

    // ---- Чат: история (не пропадает при переходах) ----
    const [chatMessages, setChatMessages] = useState([]);

    // ---- Чат: свёрнутость sidebar-режима ----
    const [chatCollapsed, setChatCollapsed] = useState(false);

    // ---- Деталь задачи (при клике на задачу в Todo или Calendar) ----
    // Используем TaskModal в режиме редактирования.
    const [taskDetail, setTaskDetail] = useState(null);

    // ============================================================
    // Хелперы
    // ============================================================
    /** Открыть чат в центре (вкладка 'chat'). Используется кнопкой Maximize2. */
    const openChatTab = () => setActivePage('chat');

    /** Сохранение задачи из TaskModal деталей */
    const handleSaveTaskDetail = (data) => {
        setTasks(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
    };

    /** При drop на день в календаре — обновляем deadline */
    const handleTaskUpdate = (updated) => {
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
    };

    /** Все теги для подсказок в TaskModal */
    const allTags = [...new Set(tasks.flatMap(t => t.tags ?? []))];

    // Где сейчас живёт чат: в центре (вкладка chat) или справа (todo/calendar)
    const chatMode      = activePage === 'chat' ? 'center' : 'sidebar';
    const showChat      = activePage !== 'home';
    const showTodoPanel = activePage === 'todo' || activePage === 'calendar';

    return (
        <div className={`workspace-module ${theme}`}>
            {/* Анимированный фон */}
            <AnimatedBg />

            {/* Основной лейаут */}
            <div className="workspace-layout">

                {/* 1. Левый Sidebar */}
                <Sidebar
                    activePage={activePage}
                    onPageChange={setActivePage}
                    collapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed(v => !v)}
                    theme={theme}
                />

                {/* Кнопка темы — внутри лейаута, чтобы не перекрывать чат */}
                <motion.button
                    className="theme-toggle"
                    onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </motion.button>

                {/* 2. Todo-панель (видна на todo и calendar) */}
                <AnimatePresence>
                    {showTodoPanel && (
                        <TodoList
                            key="todo-panel"
                            theme={theme}
                            tasks={tasks}
                            onTasksChange={setTasks}
                            onTaskClick={(t) => setTaskDetail(t)}
                            onOpenFullChat={openChatTab}
                            draggable={activePage === 'calendar'}
                        />
                    )}
                </AnimatePresence>

                {/* 3. Центральная область */}
                <main className={`workspace-main ${theme}`}>

                    {/* Главная — приветствие */}
                    {activePage === 'home' && (
                        <motion.div
                            className="main-greeting"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="greeting-title">Привет!</h1>
                            <p className="greeting-sub">Над чем поработаем сегодня?</p>
                        </motion.div>
                    )}

                    {/* Todo-страница: подсказка в центре, основной список — слева */}
                    {activePage === 'todo' && (
                        <motion.div
                            className="main-todo-hint"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <p>Кликните по задаче, чтобы посмотреть детали, или добавьте новую</p>
                        </motion.div>
                    )}

                    {/* Calendar-страница */}
                    {activePage === 'calendar' && (
                        <CalendarModule
                            theme={theme}
                            tasks={tasks}
                            onTaskUpdate={handleTaskUpdate}
                        />
                    )}

                    {/* Chat-страница: чат в центре */}
                    <AnimatePresence>
                        {activePage === 'chat' && (
                            <AIChatPanel
                                key="chat-center"
                                theme={theme}
                                mode="center"
                                messages={chatMessages}
                                onMessages={setChatMessages}
                            />
                        )}
                    </AnimatePresence>
                </main>

                {/* 4. Правая панель чата (mode='sidebar') — на todo/calendar */}
                <AnimatePresence>
                    {showChat && chatMode === 'sidebar' && (
                        <AIChatPanel
                            key="chat-sidebar"
                            theme={theme}
                            mode="sidebar"
                            messages={chatMessages}
                            onMessages={setChatMessages}
                            collapsed={chatCollapsed}
                            onToggleCollapse={() => setChatCollapsed(v => !v)}
                            onExpandToChat={openChatTab}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* ---- Деталь задачи (открывается по клику на задачу) ---- */}
            <AnimatePresence>
                {taskDetail && (
                    <TaskModal
                        task={taskDetail}
                        onSave={handleSaveTaskDetail}
                        onClose={() => setTaskDetail(null)}
                        allTags={allTags}
                        theme={theme}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default WorkspaceModule;
