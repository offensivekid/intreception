const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./config/database');
const apiRoutes = require('./routes/api');
const { updateLeaderboard } = require('./controllers/leaderboardController');
const { initializeBadges } = require('./controllers/badgeController');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', limiter);

app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

cron.schedule('0 */6 * * *', async () => {
  console.log('Запуск обновления лидерборда...');
  await updateLeaderboard();
});

cron.schedule('0 0 * * *', async () => {
  console.log('Проверка истёкших подписок...');
  try {
    const result = await db.query(
      `UPDATE users 
       SET subscription_active = false 
       WHERE subscription_active = true 
       AND subscription_expires_at < NOW()`
    );
    console.log(`✓ Деактивировано подписок: ${result.rowCount}`);
  } catch (error) {
    console.error('Ошибка проверки подписок:', error);
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

async function startServer() {
  try {
    await db.query('SELECT NOW()');
    console.log('✓ Подключение к базе данных установлено');

    await initializeBadges();
    await updateLeaderboard();

    app.listen(PORT, () => {
      console.log(`✓ Сервер запущен на порту ${PORT}`);
      console.log(`✓ Режим: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Ошибка запуска сервера:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
