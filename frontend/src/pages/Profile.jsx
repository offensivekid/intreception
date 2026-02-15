import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reviewsAPI, badgesAPI, subscriptionAPI } from '../api/client';
import { User, Award, CreditCard } from 'lucide-react';

export default function Profile({ user }) {
  const [solutions, setSolutions] = useState([]);
  const [badges, setBadges] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [solutionsRes, badgesRes, subRes] = await Promise.all([
        reviewsAPI.getMySolutions(),
        badgesAPI.get(),
        subscriptionAPI.getStatus()
      ]);
      
      setSolutions(solutionsRes.data.solutions);
      setBadges(badgesRes.data.badges);
      setSubscription(subRes.data.subscription);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  const earnedBadges = badges.filter(b => b.earned);

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Профиль</h1>

      <div className="grid grid-2" style={{ marginBottom: '30px' }}>
        <div className="stat-card">
          <User size={32} style={{ marginBottom: '10px', color: '#00ff88' }} />
          <div className="stat-value">{user.username}</div>
          <div className="stat-label">
            <span className={`badge badge-${user.role}`}>{user.role}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{user.reputation}</div>
          <div className="stat-label">Репутация</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{user.credits}</div>
          <div className="stat-label">Кредиты</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{solutions.filter(s => s.status === 'approved').length}</div>
          <div className="stat-label">Решено задач</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>
              <CreditCard size={20} style={{ display: 'inline', marginRight: '8px' }} />
              Подписка
            </h3>
            {user.subscription_active ? (
              <p style={{ color: '#00ff88', marginTop: '10px' }}>
                Активна до {new Date(user.subscription_expires_at).toLocaleDateString('ru-RU')}
              </p>
            ) : (
              <p style={{ color: '#ff4444', marginTop: '10px' }}>Не активна</p>
            )}
          </div>
          {!user.subscription_active && (
            <Link to="/subscription" className="btn btn-primary">
              Оформить подписку
            </Link>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>
          <Award size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Бейджи ({earnedBadges.length})
        </h3>
        
        {earnedBadges.length === 0 ? (
          <p style={{ color: '#666' }}>У вас пока нет бейджей. Решайте задачи, чтобы их получить!</p>
        ) : (
          <div className="badge-grid">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="badge-item earned">
                <div className="badge-icon">🏆</div>
                <div className="badge-name">{badge.name}</div>
                <div className="badge-description">{badge.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Мои решения</h3>
        
        {solutions.length === 0 ? (
          <div className="empty-state">
            <p>Вы еще не отправили ни одного решения</p>
            <Link to="/tasks" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Перейти к задачам
            </Link>
          </div>
        ) : (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Задача</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Проверок</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {solutions.map((solution) => (
                <tr key={solution.id}>
                  <td>{solution.title}</td>
                  <td>
                    <span className={`badge badge-${solution.difficulty}`}>
                      {solution.category}
                    </span>
                  </td>
                  <td>
                    <span className={`status-${solution.status}`}>
                      {solution.status === 'pending' && 'На проверке'}
                      {solution.status === 'approved' && 'Одобрено'}
                      {solution.status === 'rejected' && 'Отклонено'}
                    </span>
                  </td>
                  <td>{solution.review_count}</td>
                  <td>{new Date(solution.submitted_at).toLocaleDateString('ru-RU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
