const db = require('../config/database');

const submitReview = async (req, res) => {
  const { solutionId } = req.params;
  const { rating, feedback, is_approved } = req.body;

  if (rating === undefined || is_approved === undefined) {
    return res.status(400).json({ error: 'Рейтинг и статус проверки обязательны' });
  }

  try {
    const solutionResult = await db.query(
      `SELECT s.*, ti.task_id, t.points
       FROM solutions s
       JOIN task_instances ti ON s.task_instance_id = ti.id
       JOIN tasks t ON ti.task_id = t.id
       WHERE s.id = $1`,
      [solutionId]
    );

    if (solutionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Решение не найдено' });
    }

    const solution = solutionResult.rows[0];

    if (solution.user_id === req.user.id) {
      return res.status(403).json({ error: 'Нельзя проверять собственные решения' });
    }

    if (solution.status !== 'pending') {
      return res.status(400).json({ error: 'Решение уже проверено' });
    }

    const existingReview = await db.query(
      'SELECT * FROM reviews WHERE solution_id = $1 AND reviewer_id = $2',
      [solutionId, req.user.id]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: 'Вы уже проверили это решение' });
    }

    const creditsAwarded = is_approved ? Math.floor(solution.points * 0.3) : 0;
    const reputationChange = is_approved ? Math.floor(solution.points * 0.5) : -5;

    const reviewResult = await db.query(
      `INSERT INTO reviews (solution_id, reviewer_id, rating, feedback, is_approved, credits_awarded, reputation_change)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [solutionId, req.user.id, rating, feedback, is_approved, creditsAwarded, reputationChange]
    );

    const newStatus = is_approved ? 'approved' : 'rejected';
    await db.query(
      'UPDATE solutions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, solutionId]
    );

    if (is_approved) {
      await db.query(
        `UPDATE users SET 
          reputation = reputation + $1,
          credits = credits + $2
         WHERE id = $3`,
        [reputationChange, creditsAwarded, solution.user_id]
      );

      const userResult = await db.query('SELECT reputation FROM users WHERE id = $1', [solution.user_id]);
      await updateUserRole(solution.user_id, userResult.rows[0].reputation);
    }

    await db.query(
      `UPDATE users SET 
        credits = credits + 10,
        reputation = reputation + 2
       WHERE id = $1`,
      [req.user.id]
    );

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'review_submitted', JSON.stringify({ 
        solution_id: solutionId, 
        is_approved,
        credits_awarded: creditsAwarded 
      })]
    );

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [solution.user_id, 'solution_reviewed', JSON.stringify({ 
        solution_id: solutionId, 
        is_approved,
        reviewer_id: req.user.id,
        reputation_change: reputationChange
      })]
    );

    res.status(201).json({
      message: 'Проверка отправлена',
      review: reviewResult.rows[0]
    });
  } catch (error) {
    console.error('Ошибка отправки проверки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

async function updateUserRole(userId, reputation) {
  let newRole = 'novice';

  if (reputation >= 5000) {
    newRole = 'reviewer';
  } else if (reputation >= 2000) {
    newRole = 'mentor';
  } else if (reputation >= 500) {
    newRole = 'advanced';
  } else if (reputation >= 100) {
    newRole = 'member';
  }

  await db.query('UPDATE users SET role = $1 WHERE id = $2', [newRole, userId]);

  await db.query(
    'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
    [userId, 'role_updated', JSON.stringify({ new_role: newRole, reputation })]
  );
}

const getUserSolutions = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, t.title, t.points, t.category, t.difficulty,
              (SELECT COUNT(*) FROM reviews r WHERE r.solution_id = s.id) as review_count
       FROM solutions s
       JOIN task_instances ti ON s.task_instance_id = ti.id
       JOIN tasks t ON ti.task_id = t.id
       WHERE s.user_id = $1
       ORDER BY s.submitted_at DESC`,
      [req.user.id]
    );

    res.json({ solutions: result.rows });
  } catch (error) {
    console.error('Ошибка получения решений пользователя:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getSolutionReviews = async (req, res) => {
  const { solutionId } = req.params;

  try {
    const result = await db.query(
      `SELECT r.*, u.username, u.role
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.solution_id = $1
       ORDER BY r.created_at DESC`,
      [solutionId]
    );

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Ошибка получения проверок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  submitReview,
  getUserSolutions,
  getSolutionReviews
};
