import { useState, useEffect } from 'react';
import { adminAPI } from '../api/client';
import { TrendingUp, Users, CheckCircle, DollarSign } from 'lucide-react';

export default function Admin({ user }) {
  const [stats, setStats] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (user.role === 'reviewer') {
      fetchData();
    }
  }, [user.role]);

  const fetchData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPendingTasks()
      ]);
      
      setStats(statsRes.data.stats);
      setPendingTasks(tasksRes.data.tasks);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTask = async (taskId) => {
    try {
      await adminAPI.approveTask(taskId);
      setMessage({ type: 'success', text: 'Задача одобрена' });
      setPendingTasks(pendingTasks.filter(t => t.id !== taskId));
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка одобрения задачи' });
    }
  };

  const handleRejectTask = async (taskId) => {
    const reason = prompt('Укажите причину отклонения:');
    if (!reason) return;

    try {
      await adminAPI.rejectTask(taskId, { reason });
      setMessage({ type: 'success', text: 'Задача отклонена' });
      setPendingTasks(pendingTasks.filter(t => t.id !== taskId));
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка отклонения задачи' });
    }
  };

  if (user.role !== 'reviewer') {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>Доступ запрещен</h2>
          <p>Только администраторы могут просматривать эту страницу</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Панель администратора</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: '40px' }}>
        <div className="stat-card">
          <Users size={32} style={{ marginBottom: '10px', color: '#00ff88' }} />
          <div className="stat-value">{stats.total_users}</div>
          <div className="stat-label">Всего пользователей</div>
        </div>

        <div className="stat-card">
          <CheckCircle size={32} style={{ marginBottom: '10px', color: '#00ff88' }} />
          <div className="stat-value">{stats.active_subscribers}</div>
          <div className="stat-label">Активных подписок</div>
        </div>

        <div className="stat-card">
          <DollarSign size={32} style={{ marginBottom: '10px', color: '#00ff88' }} />
          <div className="stat-value">${(stats.mrr / 100).toFixed(0)}</div>
          <div className="stat-label">MRR (месячный доход)</div>
        </div>

        <div className="stat-card">
          <TrendingUp size={32} style={{ marginBottom: '10px', color: '#00ff88' }} />
          <div className="stat-value">{stats.total_tasks}</div>
          <div className="stat-label">Всего задач</div>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '40px' }}>
        <div className="stat-card">
          <div className="stat-value">{stats.total_solutions}</div>
          <div className="stat-label">Всего решений</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{stats.total_reviews}</div>
          <div className="stat-label">Всего проверок</div>
        </div>

        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ffaa00' }}>{stats.pending_solutions}</div>
          <div className="stat-label">Ожидают проверки</div>
        </div>

        <div className="stat-card">
          <div className="stat-value" style={{ color: '#ffaa00' }}>{stats.pending_tasks}</div>
          <div className="stat-label">Задач на модерацию</div>
        </div>
      </div>

      {stats.top_users && stats.top_users.length > 0 && (
        <div className="card" style={{ marginBottom: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Топ пользователей</h2>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Репутация</th>
                <th>Решено</th>
                <th>Проверок</th>
              </tr>
            </thead>
            <tbody>
              {stats.top_users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>
                    <span className={`badge badge-${u.role}`}>{u.role}</span>
                  </td>
                  <td style={{ color: '#00ff88' }}>{u.reputation}</td>
                  <td>{u.solved_tasks}</td>
                  <td>{u.reviews_given}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingTasks.length > 0 && (
        <div className="card">
          <h2 style={{ marginBottom: '20px' }}>Задачи на модерацию ({pendingTasks.length})</h2>
          
          <div className="grid grid-2">
            {pendingTasks.map((task) => (
              <div key={task.id} className="card" style={{ background: '#0a0a0a' }}>
                <h3>{task.title}</h3>
                <p style={{ color: '#888', margin: '10px 0', fontSize: '14px' }}>
                  Автор: {task.creator_username}
                </p>
                <p style={{ color: '#b0b0b0', marginBottom: '15px' }}>
                  {task.description.substring(0, 150)}...
                </p>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <span className={`badge badge-${task.difficulty}`}>
                    {task.difficulty}
                  </span>
                  <span className="badge" style={{ background: '#2a2a2a' }}>
                    {task.category}
                  </span>
                  <span style={{ color: '#00ff88', fontWeight: '600' }}>
                    {task.points} очков
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleApproveTask(task.id)}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Одобрить
                  </button>
                  <button 
                    onClick={() => handleRejectTask(task.id)}
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.monthly_revenue && stats.monthly_revenue.length > 0 && (
        <div className="card" style={{ marginTop: '40px' }}>
          <h2 style={{ marginBottom: '20px' }}>Доход по месяцам</h2>
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Месяц</th>
                <th>Доход</th>
                <th>Подписок</th>
              </tr>
            </thead>
            <tbody>
              {stats.monthly_revenue.map((item, i) => (
                <tr key={i}>
                  <td>{new Date(item.month).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })}</td>
                  <td style={{ color: '#00ff88', fontWeight: '600' }}>
                    ${(item.revenue / 100).toFixed(2)}
                  </td>
                  <td>{item.subscriptions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
