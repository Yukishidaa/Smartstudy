import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import AnimatedBg from '../components/AnimatedBg';
import './AuthPages.css';

function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: API call for login
        navigate('/workspace');
    };

    return (
        <section className="auth-page">
            <AnimatedBg />
            <div className="login-box auth-box">
                <form onSubmit={handleSubmit}>
                    <h2>Авторизация</h2>
                    <div className="input-box">
                        <span className="icon"><Mail size={20} /></span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <label>Почта</label>
                    </div>
                    <div className="input-box">
                        <span className="icon"><Lock size={20} /></span>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <label>Пароль</label>
                    </div>
                    <div className="remember-forgot">
                        <label><input type="checkbox" /> Запомнить пароль?</label>
                        <a href="#">Забыли пароль?</a>
                    </div>
                    <button type="submit" className="liquid-btn">
                        <span className="btn-text">Войти</span>
                        <span className="btn-shine"></span>
                    </button>
                    <div className="auth-link">
                        <p>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default LoginPage;
