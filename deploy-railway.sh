#!/bin/bash

echo "🚀 Railway Deployment Script для CyberSec Platform"
echo "=================================================="
echo ""

# Проверка установки Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI не установлен"
    echo "Установите: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI установлен"
echo ""

# Логин в Railway
echo "🔐 Логин в Railway..."
railway login

if [ $? -ne 0 ]; then
    echo "❌ Ошибка логина"
    exit 1
fi

echo "✅ Логин успешен"
echo ""

# Создание нового проекта или связь с существующим
echo "📦 Хотите создать новый проект или связать с существующим?"
echo "1) Создать новый проект"
echo "2) Связать с существующим"
read -p "Выберите (1/2): " choice

if [ "$choice" = "1" ]; then
    echo "Создание нового проекта..."
    railway init
else
    echo "Введите Project ID (можно найти в Railway Dashboard):"
    read project_id
    railway link $project_id
fi

echo ""
echo "📊 Добавление PostgreSQL базы данных..."
echo "Перейдите в Railway Dashboard и добавьте PostgreSQL через веб-интерфейс"
echo "Нажмите Enter когда добавите базу данных..."
read

echo ""
echo "🔧 Настройка переменных окружения..."
echo ""

read -p "JWT Secret (минимум 32 символа): " jwt_secret
railway variables set JWT_SECRET="$jwt_secret"

read -p "Stripe Secret Key: " stripe_key
railway variables set STRIPE_SECRET_KEY="$stripe_key"

read -p "Stripe Webhook Secret: " stripe_webhook
railway variables set STRIPE_WEBHOOK_SECRET="$stripe_webhook"

railway variables set NODE_ENV="production"
railway variables set PORT="3000"

echo ""
echo "✅ Переменные установлены"
echo ""

# Применение схемы базы данных
echo "📄 Применение схемы базы данных..."
echo "Скопируйте содержимое database/schema.sql и выполните в Railway PostgreSQL Query"
echo "Нажмите Enter когда выполните схему..."
read

echo ""
echo "🚀 Деплой приложения..."
railway up

if [ $? -ne 0 ]; then
    echo "❌ Ошибка деплоя"
    exit 1
fi

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Откройте Railway Dashboard и получите URL вашего сервиса"
echo "2. Добавьте переменную FRONTEND_URL=https://ваш-url.railway.app"
echo "3. Настройте Stripe Webhook на https://ваш-url.railway.app/api/webhook/stripe"
echo "4. Проверьте логи: railway logs"
echo ""
echo "🎉 Готово! Ваша платформа задеплоена на Railway!"
