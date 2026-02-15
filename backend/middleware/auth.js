const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Пользователь не найден' });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
};

const requireSubscription = (req, res, next) => {
  if (!req.user.subscription_active) {
    return res.status(403).json({ error: 'Требуется активная подписка' });
  }
  
  const now = new Date();
  const expiresAt = new Date(req.user.subscription_expires_at);
  
  if (expiresAt < now) {
    return res.status(403).json({ error: 'Подписка истекла' });
  }
  
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  requireSubscription,
  requireRole
};
