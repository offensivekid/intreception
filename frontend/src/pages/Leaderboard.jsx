import { useState, useEffect } from 'react';
import { leaderboardAPI } from '../api/client';
import { Trophy, Medal, Award } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [period, setPeriod] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const response = await leaderboardAPI.get({ period, limit: 100 });
      setLeaderboard(response.data.leaderboard);
    } catch (err) {
      console.error('Ошибка загрузки лидерборда:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={24} color="#FFD700" />;
    if (rank === 2) return <Medal size={24} color="#C0C0C0" />;
    if (rank === 3) return <Award size={24} color="#CD7F32" />;
    return <span style={{ color: '#666' }}>#{rank}</span>;
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Лидерборд</h1>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className={`btn ${period === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('all')}
          >
            Все время
          </button>
          <button 
            className={`btn ${period === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('month')}
          >
            Месяц
          </button>
          <button 
            className={`btn ${period === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setPeriod('week')}
          >
            Неделя
          </button>
        </div>
      </div>

      <div className="card">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Ранг</th>
              <th>Пользователь</th>
              <th>Роль</th>
              <th>Репутация</th>
              <th>Решено задач</th>
              <th>Проверок</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user) => (
              <tr key={user.id}>
                <td>{getRankIcon(parseInt(user.rank))}</td>
                <td style={{ fontWeight: '600' }}>{user.username}</td>
                <td>
                  <span className={`badge badge-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td style={{ color: '#00ff88', fontWeight: '600' }}>
                  {user.reputation}
                </td>
                <td>{user.solved_tasks}</td>
                <td>{user.reviews_given}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {leaderboard.length === 0 && (
          <div className="empty-state">
            <Trophy size={64} />
            <h2>Нет данных</h2>
          </div>
        )}
      </div>
    </div>
  );
}
