const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const register = async (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  try {
    const existingUser = await db.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email или username уже используется' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, username, role, reputation, credits) 
       VALUES ($1, $2, $3, 'novice', 0, 10) 
       RETURNING id, email, username, role, reputation, credits`,
      [email, passwordHash, username]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [user.id, 'user_registered', JSON.stringify({ email, username })]
    );

    res.status(201).json({
      message: 'Пользователь зарегистрирован',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        reputation: user.reputation,
        credits: user.credits
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email и пароль обязательны' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await db.query(
      'INSERT INTO activity_log (user_id, action) VALUES ($1, $2)',
      [user.id, 'user_login']
    );

    res.json({
      message: 'Вход выполнен',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        reputation: user.reputation,
        credits: user.credits,
        subscription_active: user.subscription_active,
        subscription_expires_at: user.subscription_expires_at
      }
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getProfile = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, email, username, role, reputation, credits, 
              subscription_active, subscription_expires_at, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  register,
  login,
  getProfile
};
