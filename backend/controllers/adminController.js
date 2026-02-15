const db = require('../config/database');

const getAdminStats = async (req, res) => {
  try {
    const usersResult = await db.query('SELECT COUNT(*) FROM users');
    const activeSubsResult = await db.query(
      'SELECT COUNT(*) FROM users WHERE subscription_active = true'
    );
    const tasksResult = await db.query('SELECT COUNT(*) FROM tasks WHERE is_approved = true');
    const solutionsResult = await db.query('SELECT COUNT(*) FROM solutions');
    const reviewsResult = await db.query('SELECT COUNT(*) FROM reviews');

    const revenueResult = await db.query(
      `SELECT 
        SUM(amount) as total_revenue,
        COUNT(*) as total_subscriptions
       FROM subscriptions
       WHERE status = 'active'`
    );

    const monthlyRevenueResult = await db.query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        SUM(amount) as revenue,
        COUNT(*) as subscriptions
       FROM subscriptions
       WHERE created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`
    );

    const userGrowthResult = await db.query(
      `SELECT 
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as new_users
       FROM users
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', created_at)
       ORDER BY date DESC`
    );

    const topUsersResult = await db.query(
      `SELECT 
        u.id,
        u.username,
        u.role,
        u.reputation,
        COUNT(DISTINCT s.id) as solved_tasks,
        COUNT(DISTINCT r.id) as reviews_given
       FROM users u
       LEFT JOIN solutions s ON u.id = s.user_id AND s.status = 'approved'
       LEFT JOIN reviews r ON u.id = r.reviewer_id
       GROUP BY u.id, u.username, u.role, u.reputation
       ORDER BY u.reputation DESC
       LIMIT 10`
    );

    const pendingSolutionsResult = await db.query(
      'SELECT COUNT(*) FROM solutions WHERE status = $1',
      ['pending']
    );

    const pendingTasksResult = await db.query(
      'SELECT COUNT(*) FROM tasks WHERE is_approved = false'
    );

    res.json({
      stats: {
        total_users: parseInt(usersResult.rows[0].count),
        active_subscribers: parseInt(activeSubsResult.rows[0].count),
        total_tasks: parseInt(tasksResult.rows[0].count),
        total_solutions: parseInt(solutionsResult.rows[0].count),
        total_reviews: parseInt(reviewsResult.rows[0].count),
        pending_solutions: parseInt(pendingSolutionsResult.rows[0].count),
        pending_tasks: parseInt(pendingTasksResult.rows[0].count),
        mrr: revenueResult.rows[0].total_revenue || 0,
        total_subscriptions: parseInt(revenueResult.rows[0].total_subscriptions) || 0
      },
      monthly_revenue: monthlyRevenueResult.rows,
      user_growth: userGrowthResult.rows,
      top_users: topUsersResult.rows
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const approveTask = async (req, res) => {
  const { taskId } = req.params;

  try {
    const result = await db.query(
      'UPDATE tasks SET is_approved = true WHERE id = $1 RETURNING *',
      [taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    const task = result.rows[0];

    await db.query(
      'UPDATE users SET credits = credits + 100, reputation = reputation + 50 WHERE id = $1',
      [task.created_by]
    );

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [task.created_by, 'task_approved', JSON.stringify({ task_id: taskId, title: task.title })]
    );

    res.json({ message: 'Задача одобрена', task });
  } catch (error) {
    console.error('Ошибка одобрения задачи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const rejectTask = async (req, res) => {
  const { taskId } = req.params;
  const { reason } = req.body;

  try {
    const result = await db.query(
      'DELETE FROM tasks WHERE id = $1 RETURNING *',
      [taskId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    const task = result.rows[0];

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [task.created_by, 'task_rejected', JSON.stringify({ task_id: taskId, title: task.title, reason })]
    );

    res.json({ message: 'Задача отклонена' });
  } catch (error) {
    console.error('Ошибка отклонения задачи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getPendingTasks = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, u.username as creator_username
       FROM tasks t
       JOIN users u ON t.created_by = u.id
       WHERE t.is_approved = false
       ORDER BY t.created_at DESC`
    );

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('Ошибка получения задач на модерацию:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getRecentActivity = async (req, res) => {
  const { limit = 50 } = req.query;

  try {
    const result = await db.query(
      `SELECT al.*, u.username
       FROM activity_log al
       JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );

    res.json({ activities: result.rows });
  } catch (error) {
    console.error('Ошибка получения активности:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  getAdminStats,
  approveTask,
  rejectTask,
  getPendingTasks,
  getRecentActivity
};
