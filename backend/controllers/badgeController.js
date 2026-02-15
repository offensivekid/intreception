const db = require('../config/database');

const getBadges = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM badges ORDER BY id');

    const userBadgesResult = await db.query(
      'SELECT badge_id FROM user_badges WHERE user_id = $1',
      [req.user.id]
    );

    const userBadgeIds = userBadgesResult.rows.map(row => row.badge_id);

    const badgesWithStatus = result.rows.map(badge => ({
      ...badge,
      earned: userBadgeIds.includes(badge.id)
    }));

    res.json({ badges: badgesWithStatus });
  } catch (error) {
    console.error('Ошибка получения бейджей:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const checkAndAwardBadges = async (userId) => {
  try {
    const userResult = await db.query(
      `SELECT u.*, 
        COUNT(DISTINCT s.id) as solved_tasks,
        COUNT(DISTINCT r.id) as reviews_given,
        COUNT(DISTINCT t.id) as tasks_created
       FROM users u
       LEFT JOIN solutions s ON u.id = s.user_id AND s.status = 'approved'
       LEFT JOIN reviews r ON u.id = r.reviewer_id
       LEFT JOIN tasks t ON u.id = t.created_by
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );

    if (userResult.rows.length === 0) return;

    const user = userResult.rows[0];

    const badges = [
      {
        name: 'Первый шаг',
        criteria: user.solved_tasks >= 1,
        badge_id: 1
      },
      {
        name: 'Десяточка',
        criteria: user.solved_tasks >= 10,
        badge_id: 2
      },
      {
        name: 'Ветеран',
        criteria: user.solved_tasks >= 50,
        badge_id: 3
      },
      {
        name: 'Легенда',
        criteria: user.solved_tasks >= 100,
        badge_id: 4
      },
      {
        name: 'Рецензент',
        criteria: user.reviews_given >= 10,
        badge_id: 5
      },
      {
        name: 'Главный судья',
        criteria: user.reviews_given >= 50,
        badge_id: 6
      },
      {
        name: 'Создатель',
        criteria: user.tasks_created >= 5,
        badge_id: 7
      },
      {
        name: 'Репутация 1000',
        criteria: user.reputation >= 1000,
        badge_id: 8
      },
      {
        name: 'Элита',
        criteria: user.reputation >= 5000,
        badge_id: 9
      }
    ];

    for (const badge of badges) {
      if (badge.criteria) {
        const existingBadge = await db.query(
          'SELECT * FROM user_badges WHERE user_id = $1 AND badge_id = $2',
          [userId, badge.badge_id]
        );

        if (existingBadge.rows.length === 0) {
          await db.query(
            'INSERT INTO user_badges (user_id, badge_id) VALUES ($1, $2)',
            [userId, badge.badge_id]
          );

          await db.query(
            'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
            [userId, 'badge_earned', JSON.stringify({ badge_name: badge.name, badge_id: badge.badge_id })]
          );
        }
      }
    }
  } catch (error) {
    console.error('Ошибка проверки бейджей:', error);
  }
};

const initializeBadges = async () => {
  try {
    const badges = [
      { id: 1, name: 'Первый шаг', description: 'Решите первую задачу', criteria: { solved_tasks: 1 } },
      { id: 2, name: 'Десяточка', description: 'Решите 10 задач', criteria: { solved_tasks: 10 } },
      { id: 3, name: 'Ветеран', description: 'Решите 50 задач', criteria: { solved_tasks: 50 } },
      { id: 4, name: 'Легенда', description: 'Решите 100 задач', criteria: { solved_tasks: 100 } },
      { id: 5, name: 'Рецензент', description: 'Проверьте 10 решений', criteria: { reviews_given: 10 } },
      { id: 6, name: 'Главный судья', description: 'Проверьте 50 решений', criteria: { reviews_given: 50 } },
      { id: 7, name: 'Создатель', description: 'Создайте 5 задач', criteria: { tasks_created: 5 } },
      { id: 8, name: 'Репутация 1000', description: 'Достигните репутации 1000', criteria: { reputation: 1000 } },
      { id: 9, name: 'Элита', description: 'Достигните репутации 5000', criteria: { reputation: 5000 } }
    ];

    for (const badge of badges) {
      await db.query(
        `INSERT INTO badges (id, name, description, criteria)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [badge.id, badge.name, badge.description, JSON.stringify(badge.criteria)]
      );
    }

    console.log('✓ Бейджи инициализированы');
  } catch (error) {
    console.error('Ошибка инициализации бейджей:', error);
  }
};

module.exports = {
  getBadges,
  checkAndAwardBadges,
  initializeBadges
};
