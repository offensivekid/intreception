# Quick Deploy to Railway

## Автоматический деплой (рекомендуется)

1. **Установите Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Запустите скрипт деплоя:**
   ```bash
   ./deploy-railway.sh
   ```

3. **Следуйте инструкциям скрипта**

## Ручной деплой

1. **Создайте проект на Railway.app**

2. **Добавьте PostgreSQL:**
   - New → Database → PostgreSQL

3. **Примените схему БД:**
   - Скопируйте `database/schema.sql` в PostgreSQL Query

4. **Настройте переменные окружения:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=ваш-секретный-ключ-32-символа
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FRONTEND_URL=https://ваш-домен.railway.app
   NODE_ENV=production
   PORT=3000
   ```

5. **Деплой из GitHub:**
   - Запушьте код на GitHub
   - Railway: New → GitHub Repo → Выберите репозиторий

6. **Настройте Stripe Webhook:**
   - URL: `https://ваш-домен.railway.app/api/webhook/stripe`
   - События: checkout.session.completed, customer.subscription.*, invoice.payment_*

## После деплоя

1. Откройте ваш Railway URL
2. Зарегистрируйте первого пользователя
3. Проверьте логи: `railway logs`

## Документация

Подробная инструкция: [DEPLOY_RAILWAY.md](./DEPLOY_RAILWAY.md)

## Стоимость

- Free tier: $5/месяц кредитов
- Production: ~$10-20/месяц (backend + PostgreSQL)

## Поддержка

Проблемы? Проверьте:
1. Логи в Railway Dashboard
2. Переменные окружения
3. Подключение к БД
4. Stripe webhook URL
