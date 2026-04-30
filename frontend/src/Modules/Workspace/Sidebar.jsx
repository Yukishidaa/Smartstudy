import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, ListTodo, Calendar as CalendarIcon, Bot,
    ChevronLeft, ChevronRight,
} from 'lucide-react';
import './Sidebar.css';

/**
 * Sidebar — левая навигационная панель.
 *
 * Props:
 *  - activePage        {'home'|'todo'|'calendar'|'chat'}
 *  - onPageChange      {fn}
 *  - collapsed         {boolean}
 *  - onToggleCollapse  {fn}
 *  - theme             {'dark'|'light'}
 */
function Sidebar({ activePage, onPageChange, collapsed, onToggleCollapse, theme }) {
    const navItems = [
        { id: 'home',     icon: LayoutDashboard, label: 'Главная'       },
        { id: 'todo',     icon: ListTodo,        label: 'Список задач'  },
        { id: 'calendar', icon: CalendarIcon,    label: 'Календарь'     },
        { id: 'chat',     icon: Bot,             label: 'ИИ-ассистент'  },
    ];

    return (
        <motion.aside
            className={`sidebar ${theme}`}
            animate={{ width: collapsed ? 72 : 240 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            {/* Лого */}
            <div className="sidebar-header">
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            className="sidebar-logo-text"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            SmartStudy
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* Навигация */}
            <nav className="sidebar-nav">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activePage === item.id;
                    return (
                        <motion.button
                            key={item.id}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => onPageChange(item.id)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon size={20} className="nav-icon" />
                            <AnimatePresence>
                                {!collapsed && (
                                    <motion.span
                                        className="nav-label"
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -8 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </motion.button>
                    );
                })}
            </nav>

            {/* Кнопка свернуть/развернуть */}
            <button
                className="sidebar-toggle"
                onClick={onToggleCollapse}
                title={collapsed ? 'Развернуть' : 'Свернуть'}
            >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </motion.aside>
    );
}

export default Sidebar;
