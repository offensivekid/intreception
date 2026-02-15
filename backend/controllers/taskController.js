const db = require('../config/database');
const crypto = require('crypto');

const createTask = async (req, res) => {
  const { title, description, category, difficulty, points, template_code, validation_script } = req.body;

  if (!title || !description || !category || !difficulty || !points) {
    return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
  }

  try {
    const result = await db.query(
      `INSERT INTO tasks (title, description, category, difficulty, points, created_by, template_code, validation_script, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [title, description, category, difficulty, points, req.user.id, template_code, validation_script, 
       req.user.role === 'reviewer' || req.user.role === 'mentor']
    );

    await db.query(
      'UPDATE users SET credits = credits + 50 WHERE id = $1',
      [req.user.id]
    );

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'task_created', JSON.stringify({ task_id: result.rows[0].id, title })]
    );

    res.status(201).json({
      message: 'Задача создана',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка создания задачи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getTasks = async (req, res) => {
  const { category, difficulty, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = 'SELECT * FROM tasks WHERE is_approved = true';
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (difficulty) {
      query += ` AND difficulty = $${paramIndex}`;
      params.push(difficulty);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    const countQuery = 'SELECT COUNT(*) FROM tasks WHERE is_approved = true';
    const countResult = await db.query(countQuery);

    res.json({
      tasks: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Ошибка получения задач:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getTaskInstance = async (req, res) => {
  const { taskId } = req.params;

  try {
    const taskResult = await db.query('SELECT * FROM tasks WHERE id = $1 AND is_approved = true', [taskId]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: 'Задача не найдена' });
    }

    const task = taskResult.rows[0];

    let instanceResult = await db.query(
      'SELECT * FROM task_instances WHERE task_id = $1 AND user_id = $2',
      [taskId, req.user.id]
    );

    let instance;

    if (instanceResult.rows.length === 0) {
      const seed = crypto.randomBytes(16).toString('hex');
      const parameters = generateTaskParameters(task, seed);

      const insertResult = await db.query(
        `INSERT INTO task_instances (task_id, user_id, seed, parameters)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [taskId, req.user.id, seed, JSON.stringify(parameters)]
      );

      instance = insertResult.rows[0];
    } else {
      instance = instanceResult.rows[0];
    }

    res.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        difficulty: task.difficulty,
        points: task.points,
        template_code: task.template_code
      },
      instance: {
        id: instance.id,
        parameters: instance.parameters
      }
    });
  } catch (error) {
    console.error('Ошибка получения задачи:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

function generateTaskParameters(task, seed) {
  const random = seedRandom(seed);
  
  const parameters = {
    target_ip: `192.168.${Math.floor(random() * 256)}.${Math.floor(random() * 256)}`,
    port: 1024 + Math.floor(random() * 64512),
    hash_prefix: crypto.randomBytes(4).toString('hex'),
    key_length: 8 + Math.floor(random() * 8),
    difficulty_multiplier: 1 + random() * 0.5,
    custom_payload: crypto.randomBytes(16).toString('base64')
  };

  return parameters;
}

function seedRandom(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

const submitSolution = async (req, res) => {
  const { taskInstanceId } = req.params;
  const { solution_text } = req.body;

  if (!solution_text) {
    return res.status(400).json({ error: 'Решение не может быть пустым' });
  }

  try {
    const instanceResult = await db.query(
      'SELECT * FROM task_instances WHERE id = $1 AND user_id = $2',
      [taskInstanceId, req.user.id]
    );

    if (instanceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Экземпляр задачи не найден' });
    }

    const existingSolution = await db.query(
      'SELECT * FROM solutions WHERE task_instance_id = $1 AND user_id = $2 AND status = $3',
      [taskInstanceId, req.user.id, 'approved']
    );

    if (existingSolution.rows.length > 0) {
      return res.status(400).json({ error: 'Задача уже решена' });
    }

    const result = await db.query(
      `INSERT INTO solutions (task_instance_id, user_id, solution_text, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [taskInstanceId, req.user.id, solution_text]
    );

    await db.query(
      'INSERT INTO activity_log (user_id, action, details) VALUES ($1, $2, $3)',
      [req.user.id, 'solution_submitted', JSON.stringify({ solution_id: result.rows[0].id })]
    );

    res.status(201).json({
      message: 'Решение отправлено на проверку',
      solution: result.rows[0]
    });
  } catch (error) {
    console.error('Ошибка отправки решения:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

const getPendingReviews = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*, ti.parameters, t.title, t.description, t.points, u.username
       FROM solutions s
       JOIN task_instances ti ON s.task_instance_id = ti.id
       JOIN tasks t ON ti.task_id = t.id
       JOIN users u ON s.user_id = u.id
       WHERE s.status = 'pending' AND s.user_id != $1
       ORDER BY s.submitted_at ASC
       LIMIT 10`,
      [req.user.id]
    );

    res.json({ solutions: result.rows });
  } catch (error) {
    console.error('Ошибка получения решений:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskInstance,
  submitSolution,
  getPendingReviews
};
