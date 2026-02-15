import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tasksAPI } from '../api/client';
import { Send, ArrowLeft } from 'lucide-react';

export default function TaskDetail() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [instance, setInstance] = useState(null);
  const [solution, setSolution] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const response = await tasksAPI.getTask(taskId);
      setTask(response.data.task);
      setInstance(response.data.instance);
      setSolution(response.data.task.template_code || '');
    } catch (err) {
      console.error('Ошибка загрузки задачи:', err);
      setMessage({ type: 'error', text: 'Ошибка загрузки задачи' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await tasksAPI.submitSolution(instance.id, { solution_text: solution });
      setMessage({ type: 'success', text: 'Решение отправлено на проверку!' });
      setTimeout(() => navigate('/profile'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Ошибка отправки решения' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  if (!task) {
    return <div className="empty-state">Задача не найдена</div>;
  }

  return (
    <div className="container">
      <button onClick={() => navigate('/tasks')} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        <ArrowLeft size={18} style={{ display: 'inline', marginRight: '8px' }} />
        Назад к задачам
      </button>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
          <div>
            <h1>{task.title}</h1>
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <span className={`badge badge-${task.difficulty}`}>{task.difficulty}</span>
              <span className="badge" style={{ background: '#2a2a2a' }}>{task.category}</span>
              <span style={{ color: '#00ff88', fontWeight: '600', marginLeft: '10px' }}>
                {task.points} очков
              </span>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px' }}>Описание</h3>
          <p style={{ lineHeight: '1.6', color: '#b0b0b0' }}>{task.description}</p>
        </div>

        {instance && instance.parameters && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '15px' }}>Ваши персональные параметры</h3>
            <div className="card" style={{ background: '#0a0a0a' }}>
              <pre style={{ color: '#00ff88', overflow: 'auto' }}>
                {JSON.stringify(instance.parameters, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Ваше решение</label>
            <textarea
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="Введите ваше решение..."
              required
              style={{ minHeight: '300px' }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <Send size={18} style={{ display: 'inline', marginRight: '8px' }} />
            {submitting ? 'Отправка...' : 'Отправить решение'}
          </button>
        </form>
      </div>
    </div>
  );
}
