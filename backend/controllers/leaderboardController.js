const db = require('../config/database');

const getLeaderboard = async (req, res) => {
  const { period = 'all', limit = 100 } = req.query;

  try {
    let query = `
      SELECT 
        u.id,
        u.username,
        u.role,
        u.reputation,
        COUNT(DISTINCT s.id) as solved_tasks,
        COUNT(DISTINCT r.id) as reviews_given,
        ROW_NUMBER() OVER (ORDER BY u.reputation DESC) as rank
      FROM users u
      LEFT JOIN solutions s ON u.id = s.user_id AND s.status = 'approved'
      LEFT JOIN reviews r ON u.id = r.reviewer_id
    `;

    const params = [];

    if (period === 'week') {
      query += ` WHERE u.created_at >= NOW() - INTERVAL '7 days'`;
    } else if (period === 'month') {
      query += ` WHERE u.created_at >= NOW() - INTERVAL '30 days'`;
    }

    query += ` GROUP BY u.id, u.username, u.role, u.reputation
               ORDER BY u.reputation DESC
               LIMIT $1`;
    
    params.push(limit);

    const result = await db.query(query, params);

    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Ошибка получения лидерборда:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getUserRank = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        rank
       FROM (
         SELECT 
           id,
           ROW_NUMBER() OVER (ORDER BY reputation DESC) as rank
         FROM users
       ) ranked
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ rank: result.rows[0].rank });
  } catch (error) {
    console.error('Ошибка получения ранга:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const updateLeaderboard = async () => {
  try {
    await db.query('DELETE FROM leaderboard');

    await db.query(`
      INSERT INTO leaderboard (user_id, username, reputation, solved_tasks, rank)
      SELECT 
        u.id,
        u.username,
        u.reputation,
        COUNT(DISTINCT s.id) as solved_tasks,
        ROW_NUMBER() OVER (ORDER BY u.reputation DESC) as rank
      FROM users u
      LEFT JOIN solutions s ON u.id = s.user_id AND s.status = 'approved'
      GROUP BY u.id, u.username, u.reputation
      ORDER BY u.reputation DESC
    `);

    console.log('✓ Лидерборд обновлен');
  } catch (error) {
    console.error('Ошибка обновления лидерборда:', error);
  }
};

module.exports = {
  getLeaderboard,
  getUserRank,
  updateLeaderboard
};
