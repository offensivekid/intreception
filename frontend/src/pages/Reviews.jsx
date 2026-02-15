import { useState, useEffect } from 'react';
import { tasksAPI, reviewsAPI } from '../api/client';
import { CheckCircle, XCircle, Star } from 'lucide-react';

export default function Reviews({ user }) {
  const [pendingSolutions, setPendingSolutions] = useState([]);
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    feedback: '',
    is_approved: true
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (['advanced', 'mentor', 'reviewer'].includes(user.role)) {
      fetchPendingSolutions();
    }
  }, [user.role]);

  const fetchPendingSolutions = async () => {
    try {
      const response = await tasksAPI.getPendingReviews();
      setPendingSolutions(response.data.solutions);
    } catch (err) {
      console.error('Ошибка загрузки решений:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await reviewsAPI.submitReview(selectedSolution.id, reviewData);
      setMessage({ type: 'success', text: 'Проверка отправлена!' });
      setPendingSolutions(pendingSolutions.filter(s => s.id !== selectedSolution.id));
      setSelectedSolution(null);
      setReviewData({ rating: 5, feedback: '', is_approved: true });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Ошибка отправки проверки' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!['advanced', 'mentor', 'reviewer'].includes(user.role)) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>Недостаточно прав</h2>
          <p>Для проверки решений необходима роль Advanced или выше</p>
          <p style={{ marginTop: '10px', color: '#666' }}>
            Решайте задачи и набирайте репутацию для получения доступа
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="container">
      <h1 style={{ marginBottom: '30px' }}>Проверка решений</h1>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {!selectedSolution ? (
        <>
          {pendingSolutions.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={64} />
              <h2>Нет решений на проверку</h2>
              <p>Все решения проверены. Отличная работа!</p>
            </div>
          ) : (
            <div className="grid grid-2">
              {pendingSolutions.map((solution) => (
                <div key={solution.id} className="card">
                  <h3>{solution.title}</h3>
                  <p style={{ color: '#888', margin: '10px 0' }}>
                    Пользователь: {solution.username}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <span className={`badge badge-${solution.difficulty}`}>
                      {solution.difficulty}
                    </span>
                    <span style={{ color: '#00ff88', fontWeight: '600' }}>
                      {solution.points} очков
                    </span>
                  </div>

                  <button 
                    onClick={() => setSelectedSolution(solution)}
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                  >
                    Проверить
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="card">
          <button 
            onClick={() => setSelectedSolution(null)}
            className="btn btn-secondary"
            style={{ marginBottom: '20px' }}
          >
            ← Назад к списку
          </button>

          <h2 style={{ marginBottom: '20px' }}>{selectedSolution.title}</h2>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '10px' }}>Описание задачи</h3>
            <p style={{ color: '#b0b0b0', lineHeight: '1.6' }}>
              {selectedSolution.description}
            </p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '10px' }}>Параметры пользователя</h3>
            <div className="card" style={{ background: '#0a0a0a' }}>
              <pre style={{ color: '#00ff88', overflow: 'auto' }}>
                {JSON.stringify(selectedSolution.parameters, null, 2)}
              </pre>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ marginBottom: '10px' }}>Решение</h3>
            <div className="card" style={{ background: '#0a0a0a' }}>
              <pre style={{ color: '#e0e0e0', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {selectedSolution.solution_text}
              </pre>
            </div>
          </div>

          <form onSubmit={handleSubmitReview}>
            <div className="form-group">
              <label>Рейтинг (1-5)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setReviewData({ ...reviewData, rating: num })}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '24px'
                    }}
                  >
                    <Star 
                      size={32} 
                      fill={num <= reviewData.rating ? '#00ff88' : 'none'}
                      color={num <= reviewData.rating ? '#00ff88' : '#666'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Комментарий</label>
              <textarea
                value={reviewData.feedback}
                onChange={(e) => setReviewData({ ...reviewData, feedback: e.target.value })}
                placeholder="Оставьте комментарий для автора решения..."
                rows={4}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setReviewData({ ...reviewData, is_approved: true });
                  setTimeout(() => document.querySelector('form').requestSubmit(), 100);
                }}
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                <CheckCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
                Одобрить
              </button>

              <button
                type="button"
                onClick={() => {
                  setReviewData({ ...reviewData, is_approved: false });
                  setTimeout(() => document.querySelector('form').requestSubmit(), 100);
                }}
                className="btn btn-danger"
                style={{ flex: 1 }}
                disabled={submitting}
              >
                <XCircle size={18} style={{ display: 'inline', marginRight: '8px' }} />
                Отклонить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
