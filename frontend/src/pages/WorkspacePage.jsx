import { useState } from 'react';
import { LayoutDashboard, ListTodo } from 'lucide-react';
import AnimatedBg from '../components/AnimatedBg';
import './WorkspacePage.css';

function WorkspacePage() {
    const [activePage, setActivePage] = useState('home');

    const navItems = [
        { id: 'home', icon: LayoutDashboard, label: 'Главная' },
        { id: 'todo', icon: ListTodo, label: 'Список задач' },
    ];

    return (
        <div className="workspace-page">
            <AnimatedBg />
            <div className="workspace">
                <aside className="sidebar">
                    <nav className="sidebar-nav">
                        {navItems.map(item => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                                    onClick={() => setActivePage(item.id)}
                                >
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                <main className="main-content">
                    {activePage === 'home' && (
                        <div className="content-area">
                            <h1>Привет!</h1>
                            <p>Над чем поработаем сегодня?</p>
                        </div>
                    )}
                    {activePage === 'todo' && (
                        <div className="content-area">
                            <h1>Список задач</h1>
                            <p>Здесь будет управление задачами</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default WorkspacePage;
