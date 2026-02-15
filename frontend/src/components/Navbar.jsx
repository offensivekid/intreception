import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Trophy, Shield } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/" className="navbar-brand">
          <Shield size={24} style={{ display: 'inline', marginRight: '8px' }} />
          CyberSec Platform
        </Link>
        
        {user ? (
          <div className="navbar-links">
            <Link to="/tasks">Задачи</Link>
            <Link to="/leaderboard">
              <Trophy size={18} style={{ display: 'inline', marginRight: '4px' }} />
              Лидерборд
            </Link>
            <Link to="/reviews">Проверки</Link>
            <Link to="/profile">
              <User size={18} style={{ display: 'inline', marginRight: '4px' }} />
              {user.username}
            </Link>
            {user.role === 'reviewer' && (
              <Link to="/admin">Админ</Link>
            )}
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '6px 12px' }}>
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="navbar-links">
            <Link to="/login">Вход</Link>
            <Link to="/register" className="btn btn-primary">Регистрация</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
