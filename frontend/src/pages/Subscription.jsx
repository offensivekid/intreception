import { useState } from 'react';
import { subscriptionAPI } from '../api/client';
import { CreditCard, Check } from 'lucide-react';

export default function Subscription({ user }) {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const response = await subscriptionAPI.createCheckout();
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Ошибка создания сессии оплаты:', err);
      alert('Ошибка создания сессии оплаты');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Вы уверены, что хотите отменить подписку?')) {
      return;
    }

    setLoading(true);
    try {
      await subscriptionAPI.cancel();
      alert('Подписка отменена');
      window.location.reload();
    } catch (err) {
      console.error('Ошибка отмены подписки:', err);
      alert('Ошибка отмены подписки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', marginTop: '60px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Подписка</h1>

      {user.subscription_active ? (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Check size={64} color="#00ff88" style={{ marginBottom: '20px' }} />
            <h2 style={{ color: '#00ff88', marginBottom: '20px' }}>Подписка активна</h2>
            <p style={{ color: '#b0b0b0', marginBottom: '30px' }}>
              Действительна до {new Date(user.subscription_expires_at).toLocaleDateString('ru-RU')}
            </p>
            <button 
              onClick={handleCancel} 
              className="btn btn-danger"
              disabled={loading}
            >
              Отменить подписку
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CreditCard size={64} color="#00ff88" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '10px' }}>Premium подписка</h2>
            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00ff88', margin: '20px 0' }}>
              $15<span style={{ fontSize: '24px', color: '#666' }}>/месяц</span>
            </div>

            <div style={{ textAlign: 'left', maxWidth: '400px', margin: '40px auto' }}>
              <h3 style={{ marginBottom: '20px' }}>Что включено:</h3>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {[
                  'Доступ ко всем задачам',
                  'Персональные параметры для каждой задачи',
                  'Участие в треках обучения',
                  'Система репутации и рейтинга',
                  'Получение бейджей',
                  'Создание собственных задач',
                  'Проверка решений других пользователей'
                ].map((feature, i) => (
                  <li key={i} style={{ padding: '10px 0', display: 'flex', alignItems: 'center' }}>
                    <Check size={20} color="#00ff88" style={{ marginRight: '10px', flexShrink: 0 }} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={handleSubscribe} 
              className="btn btn-primary"
              style={{ fontSize: '18px', padding: '15px 40px' }}
              disabled={loading}
            >
              {loading ? 'Загрузка...' : 'Оформить подписку'}
            </button>

            <p style={{ marginTop: '20px', color: '#666', fontSize: '14px' }}>
              Отмена в любое время. Автоматическое продление.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
