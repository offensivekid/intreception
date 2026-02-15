import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tasksAPI } from '../api/client';
import { Code, Filter } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    difficulty: ''
  });

  useEffect(() => {
    fetchTasks();
  }, [filters]);

  const fetchTasks = async () => {
    try {
      const response = await tasksAPI.getTasks(filters);
      setTasks(response.data.tasks);
    } catch (err) {
      console.error('Ошибка загрузки задач:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Задачи</h1>
        <Link to="/tasks/create" className="btn btn-primary">
          Создать задачу
        </Link>
      </div>

      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Filter size={20} />
          
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">Все категории</option>
              <option value="web">Web</option>
              <option value="crypto">Криптография</option>
              <option value="reverse">Реверс</option>
              <option value="pwn">Pwn</option>
              <option value="forensics">Форензика</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
            >
              <option value="">Все уровни</option>
              <option value="beginner">Начальный</option>
              <option value="intermediate">Средний</option>
              <option value="advanced">Продвинутый</option>
              <option value="expert">Эксперт</option>
            </select>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <Code size={64} />
          <h2>Задач не найдено</h2>
          <p>Попробуйте изменить фильтры</p>
        </div>
      ) : (
        <div className="grid grid-2">
          {tasks.map((task) => (
            <Link to={`/tasks/${task.id}`} key={task.id} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                   onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                   onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h3>{task.title}</h3>
                  <span className={`badge badge-${task.difficulty}`}>
                    {task.difficulty}
                  </span>
                </div>
                
                <p style={{ color: '#888', marginBottom: '15px' }}>
                  {task.description.substring(0, 100)}...
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#00ff88', fontWeight: '600' }}>
                    {task.points} очков
                  </span>
                  <span style={{ color: '#666', fontSize: '14px' }}>
                    {task.category}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
