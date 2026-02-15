# Деплой на Railway - Пошаговая инструкция

## Шаг 1: Подготовка

1. Зарегистрируйтесь на [Railway.app](https://railway.app)
2. Установите Railway CLI (опционально):
   ```bash
   npm install -g @railway/cli
   ```

## Шаг 2: Создание проекта в Railway

### Через веб-интерфейс:

1. Войдите в Railway Dashboard
2. Нажмите **"New Project"**
3. Выберите **"Deploy from GitHub repo"** (или **"Empty Project"** если без Git)

## Шаг 3: Настройка базы данных PostgreSQL

1. В проекте нажмите **"+ New"**
2. Выберите **"Database"** → **"Add PostgreSQL"**
3. Railway автоматически создаст базу данных
4. Скопируйте **DATABASE_URL** из переменных окружения

### Применение схемы базы данных:

Вариант 1 - Через Railway CLI:
```bash
railway login
railway link [ваш-проект-id]
railway run psql -h [host] -U [user] -d [database] < database/schema.sql
```

Вариант 2 - Через веб-интерфейс:
1. Откройте PostgreSQL сервис
2. Перейдите в **"Data"** → **"Query"**
3. Скопируйте содержимое `database/schema.sql` и выполните

## Шаг 4: Деплой Backend

### Вариант A: Из GitHub (рекомендуется)

1. Создайте репозиторий на GitHub и запушьте код:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cybersec-platform.git
   git push -u origin main
   ```

2. В Railway:
   - Нажмите **"+ New"** → **"GitHub Repo"**
   - Выберите ваш репозиторий
   - Railway автоматически обнаружит настройки

### Вариант B: Через Railway CLI

```bash
cd cybersec-platform
railway init
railway up
```

## Шаг 5: Настройка переменных окружения

В Railway Dashboard для вашего backend сервиса добавьте переменные:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=ваш-супер-секретный-ключ-минимум-32-символа
PORT=3000
STRIPE_SECRET_KEY=sk_live_ваш_ключ_stripe
STRIPE_WEBHOOK_SECRET=whsec_ваш_webhook_secret
FRONTEND_URL=https://ваш-домен.railway.app
NODE_ENV=production
```

**Важно**: Railway автоматически подставит `DATABASE_URL` если использовать `${{Postgres.DATABASE_URL}}`

## Шаг 6: Настройка Stripe Webhooks

1. Перейдите в [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Нажмите **"Add endpoint"**
3. URL: `https://ваш-бэкенд.railway.app/api/webhook/stripe`
4. Выберите события:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Скопируйте **Signing secret** в переменную `STRIPE_WEBHOOK_SECRET`

## Шаг 7: Деплой Frontend (опционально отдельно)

Railway может хостить статический frontend:

1. В проекте: **"+ New"** → **"Empty Service"**
2. Настройки сервиса:
   ```
   Build Command: cd frontend && npm install && npm run build
   Start Command: npx serve -s frontend/dist -l $PORT
   ```
3. Добавьте переменную:
   ```
   VITE_API_URL=https://ваш-бэкенд.railway.app
   ```

### ИЛИ использовать CDN (Vercel, Netlify, Cloudflare Pages):

**Vercel:**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
cd frontend
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

Обновите в обоих местах переменные API URL.

## Шаг 8: Настройка домена (опционально)

1. В Railway сервисе перейдите в **"Settings"**
2. В разделе **"Domains"** нажмите **"Generate Domain"**
3. Или добавьте свой домен: **"Custom Domain"**

## Шаг 9: Проверка работы

1. Откройте ваш URL Railway
2. Зарегистрируйтесь
3. Проверьте создание задач
4. Проверьте подписку через Stripe

## Структура для Railway

```
cybersec-platform/
├── backend/          # Backend API
├── frontend/         # React frontend
├── database/         # SQL схемы
├── Dockerfile        # Docker конфигурация
├── nixpacks.toml     # Nixpacks конфигурация (Railway)
└── railway.json      # Railway настройки
```

## Railway Environment Variables Cheatsheet

```bash
# Автоматические переменные Railway:
${{Postgres.DATABASE_URL}}     # URL базы данных
${{RAILWAY_STATIC_URL}}        # Статический URL сервиса
${{RAILWAY_PUBLIC_DOMAIN}}     # Публичный домен

# Ваши переменные:
JWT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
FRONTEND_URL=
```

## Мониторинг и логи

- **Логи**: Railway Dashboard → Ваш сервис → "Logs"
- **Метрики**: "Metrics" показывает CPU, память, network
- **Database**: PostgreSQL сервис → "Metrics" для мониторинга БД

## Troubleshooting

### Ошибка подключения к БД:
```bash
# Проверьте DATABASE_URL
railway variables

# Проверьте подключение
railway run npm run db:check
```

### Frontend не отображается:
1. Проверьте что `frontend/dist` собран
2. Проверьте CORS настройки в `backend/server.js`
3. Обновите `FRONTEND_URL` в переменных

### Webhook не работает:
1. Проверьте URL в Stripe Dashboard
2. Проверьте `STRIPE_WEBHOOK_SECRET`
3. Проверьте логи Railway на ошибки

## Полезные команды Railway CLI

```bash
# Логин
railway login

# Связать с проектом
railway link

# Просмотр переменных
railway variables

# Добавить переменную
railway variables set KEY=value

# Просмотр логов
railway logs

# Деплой
railway up

# Открыть в браузере
railway open
```

## Production Checklist

- [ ] PostgreSQL база данных создана
- [ ] Схема базы данных применена
- [ ] Все переменные окружения установлены
- [ ] Stripe webhook настроен
- [ ] JWT_SECRET установлен (минимум 32 символа)
- [ ] NODE_ENV=production
- [ ] Frontend собран и задеплоен
- [ ] CORS настроен правильно
- [ ] Домен настроен (опционально)
- [ ] SSL работает (автоматически в Railway)
- [ ] Логи проверены на ошибки

## Стоимость Railway

- **Free tier**: $5 кредитов в месяц
- Хватает на hobby проект
- При масштабировании: ~$5-20/месяц за backend + PostgreSQL

## Альтернативы Railway

Если хотите другой хостинг:
- **Render.com** - похож на Railway
- **Fly.io** - для backend
- **Vercel** - для frontend
- **Heroku** - классический вариант
- **DigitalOcean App Platform** - более дорого, но стабильно

## Поддержка

Если возникли проблемы:
1. Проверьте логи в Railway
2. Проверьте переменные окружения
3. Проверьте документацию Railway: https://docs.railway.app
