import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock } from 'lucide-react';
import AnimatedBg from '../components/AnimatedBg';
import './AuthPages.css';

function RegisterPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        // TODO: API call for registration
        navigate('/workspace');
    };

    return (
        <section className="auth-page">
            <AnimatedBg />
            <div className="register-box auth-box">
                <form onSubmit={handleSubmit}>
                    <h2>Регистрация</h2>
                    <div className="input-box">
                        <span className="icon"><User size={20} /></span>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <label>Имя</label>
                    </div>
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
                    <div className="input-box">
                        <span className="icon"><Lock size={20} /></span>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <label>Подтверждение пароля</label>
                    </div>
                    <button type="submit" className="liquid-btn">
                        <span className="btn-text">Зарегистрироваться</span>
                        <span className="btn-shine"></span>
                    </button>
                    <div className="auth-link">
                        <p>Уже есть аккаунт? <Link to="/login">Авторизация</Link></p>
                    </div>
                </form>
            </div>
        </section>
    );
}

export default RegisterPage;
