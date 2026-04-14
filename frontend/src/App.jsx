import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MainPage from './pages/MainPage';
import WorkspacePage from './pages/WorkspacePage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/workspace" element={<WorkspacePage />} />
        </Routes>
    );
}

export default App;
