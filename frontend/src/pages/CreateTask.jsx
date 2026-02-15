import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI } from '../api/client';
import { Plus } from 'lucide-react';

export default function CreateTask() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'web',
    difficulty: 'beginner',
    points: 100,
    template_code: '',
    validation_script: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await tasksAPI.createTask(formData);
      setMessage({ type: 'success', text: 'Задача создана и отправлена на модерацию!' });
      setTimeout(() => navigate('/tasks'), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Ошибка создания задачи' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Создать задачу</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название задачи *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Например: SQL Injection в форме входа"
            />
          </div>

          <div className="form-group">
            <label>Описание *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              placeholder="Подробное описание задачи, цели и подсказки..."
              rows={6}
            />
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label>Категория *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="web">Web</option>
                <option value="crypto">Криптография</option>
                <option value="reverse">Реверс-инжиниринг</option>
                <option value="pwn">Pwn / Binary</option>
                <option value="forensics">Форензика</option>
                <option value="osint">OSINT</option>
              </select>
            </div>

            <div className="form-group">
              <label>Сложность *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              >
                <option value="beginner">Начальный</option>
                <option value="intermediate">Средний</option>
                <option value="advanced">Продвинутый</option>
                <option value="expert">Эксперт</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Баллы за решение *</label>
            <input
              type="number"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
              min={10}
              max={1000}
              step={10}
              required
            />
          </div>

          <div className="form-group">
            <label>Шаблон кода (опционально)</label>
            <textarea
              value={formData.template_code}
              onChange={(e) => setFormData({ ...formData, template_code: e.target.value })}
              placeholder="Начальный код для пользователя..."
              rows={8}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className="form-group">
            <label>Скрипт валидации (опционально)</label>
            <textarea
              value={formData.validation_script}
              onChange={(e) => setFormData({ ...formData, validation_script: e.target.value })}
              placeholder="Скрипт для автоматической проверки решения..."
              rows={8}
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className="alert alert-warning">
            <strong>Примечание:</strong> Задача будет отправлена на модерацию. 
            После одобрения вы получите +50 кредитов и +100 репутации.
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={18} style={{ display: 'inline', marginRight: '8px' }} />
              {loading ? 'Создание...' : 'Создать задачу'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/tasks')} 
              className="btn btn-secondary"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
