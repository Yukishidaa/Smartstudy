import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AnimatedBg from '../components/AnimatedBg';
import './MainPage.css';

function MainPage() {
    const [heroOpacity, setHeroOpacity] = useState(1);
    const [heroY, setHeroY] = useState(0);

    useEffect(() => {
        // Parallax on hero
        const handleScroll = () => {
            const scrolled = window.pageYOffset;
            if (scrolled < window.innerHeight) {
                setHeroY(scrolled * 0.3);
                setHeroOpacity(1 - (scrolled / window.innerHeight) * 0.8);
            }
        };
        window.addEventListener('scroll', handleScroll);

        // Scroll reveal for glass containers and feature cards
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.glass-container, .feature-card').forEach(el => {
            observer.observe(el);
        });

        // Smooth scroll for hash links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Handle hash scroll on load
    useEffect(() => {
        if (window.location.hash) {
            setTimeout(() => {
                const target = document.querySelector(window.location.hash);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, []);
    return (
        <div className="main-page">
            <AnimatedBg />

            <header>
                <nav className="navbar">
                    <div className="logo">
                        <span className="logo-icon">🎓</span>
                        <span className="logo-text">SmartStudy</span>
                    </div>
                    <div className="nav-links">
                        <a href="#features">Возможности</a>
                        <a href="#about">О проекте</a>
                    </div>
                    <div className="nav-auth">
                        <Link to="/login" className="nav-btn">Войти</Link>
                        <Link to="/register" className="nav-btn primary">Регистрация</Link>
                    </div>
                </nav>
            </header>

            <main>
                <section className="hero">
                    <div className="hero-content" style={{ transform: `translateY(${heroY}px)`, opacity: heroOpacity, transition: 'opacity 0.1s ease' }}>
                        <h1>Интеллектуальная система<br />адаптивного обучения</h1>
                        <p>Умное планирование, ИИ-ассистент и персонализированный подход к учёбе — всё в одном месте</p>
                        <div className="hero-buttons">
                            <Link to="/register" className="cta-btn primary">
                                <span className="btn-text">Начать бесплатно</span>
                                <span className="btn-shine"></span>
                            </Link>
                            <a href="#features" className="cta-btn secondary">
                                <span className="btn-text">Узнать больше</span>
                                <span className="btn-shine"></span>
                            </a>
                        </div>
                    </div>
                </section>

                <section id="features" className="features">
                    <div className="glass-container">
                        <h2>Возможности</h2>
                        <div className="features-grid">
                            {[
                                { icon: '📋', title: 'ToDo-лист', desc: 'Создание, редактирование и отслеживание задач с тэгами и статистикой выполнения' },
                                { icon: '📅', title: 'Календарь', desc: 'Планирование событий с drag-and-drop и синхронизацией с задачами' },
                                { icon: '🤖', title: 'ИИ-ассистент', desc: 'Контекстный чат-бот для ответов на вопросы и управления через текстовые команды' },
                                { icon: '📊', title: 'Статистика', desc: 'Аналитика продуктивности, пики активности и интеллектуальные метрики' },
                                { icon: '🎮', title: 'Геймификация', desc: 'Strike-режим и система мотивации для поддержания учебной дисциплины' },
                                { icon: '🧠', title: 'Повторения', desc: 'Интервальное повторение по алгоритму SM-2 для лучшего запоминания' },
                            ].map((f, i) => (
                                <div key={i} className="feature-card">
                                    <div className="feature-icon">{f.icon}</div>
                                    <h3>{f.title}</h3>
                                    <p>{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section id="about" className="about">
                    <div className="glass-container">
                        <h2>О проекте</h2>
                        <p>SmartStudy — это интеллектуальная система адаптивного обучения, которая подстраивается под ваш стиль учёбы.</p>
                        <div className="tech-stack">
                            <h3>Технологии</h3>
                            <div className="tech-tags">
                                {['Python', 'PostgreSQL', 'REST API', 'Docker', 'ASP.NET', 'React'].map(t => (
                                    <span key={t} className="tag">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer>
                <p>© 2026 SmartStudy. Интеллектуальная система адаптивного обучения</p>
            </footer>
        </div>
    );
}

export default MainPage;
