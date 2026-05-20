const { pool } = require("../config/database");

class Task {
  static async create({
    employee_id,
    employee_name,
    task_title,
    task_description,
    priority,
    start_date,
    due_date,
    attachment,
    assigned_by,
  }) {
    const result = await pool.query(
      `INSERT INTO tasks (
        employee_id, employee_name, task_title, task_description, priority, 
        start_date, due_date, attachment, assigned_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *`,
      [
        employee_id,
        employee_name,
        task_title,
        task_description,
        priority,
        start_date,
        due_date,
        attachment,
        assigned_by,
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT t.*, e.first_name, e.last_name, e.department, e.position,
              admin.first_name as assigned_by_first_name, admin.last_name as assigned_by_last_name
       FROM tasks t
       LEFT JOIN employees e ON t.employee_id = e.id
       LEFT JOIN employees admin ON t.assigned_by = admin.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByEmployeeId(employee_id, activeOnly = false) {
    let query = `SELECT t.*, e.first_name, e.last_name,
              admin.first_name as assigned_by_first_name, admin.last_name as assigned_by_last_name
       FROM tasks t
       LEFT JOIN employees e ON t.employee_id = e.id
       LEFT JOIN employees admin ON t.assigned_by = admin.id
       WHERE t.employee_id = $1`;
    
    const params = [employee_id];

    // Filter to active/in-progress tasks for time tracking
    if (activeOnly) {
      query += ` AND t.status IN ('pending', 'in-progress')`;
    }

    query += ` ORDER BY t.created_at DESC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findAll(filters = {}) {
    let query = `SELECT t.*, e.first_name, e.last_name, e.department,
                        admin.first_name as assigned_by_first_name, admin.last_name as assigned_by_last_name
                 FROM tasks t
                 LEFT JOIN employees e ON t.employee_id = e.id
                 LEFT JOIN employees admin ON t.assigned_by = admin.id
                 WHERE 1=1`;
    const params = [];

    if (filters.employee_id) {
      query += ` AND t.employee_id = $${params.length + 1}`;
      params.push(filters.employee_id);
    }

    if (filters.status) {
      query += ` AND t.status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.priority) {
      query += ` AND t.priority = $${params.length + 1}`;
      params.push(filters.priority);
    }

    if (filters.assigned_by) {
      query += ` AND t.assigned_by = $${params.length + 1}`;
      params.push(filters.assigned_by);
    }

    if (filters.search) {
      query += ` AND (t.task_title ILIKE $${params.length + 1} OR t.task_description ILIKE $${params.length + 1} OR e.first_name ILIKE $${params.length + 1})`;
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
      params.push(`%${filters.search}%`);
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    if (fields.length === 1) return null;

    const query = `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${paramCount} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [id]);
    return result.rows[0];
  }

  static async getTaskStats(admin_id) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'on-hold' THEN 1 ELSE 0 END) as on_hold,
        SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 ELSE 0 END) as overdue
       FROM tasks
       WHERE assigned_by = $1`,
      [admin_id]
    );
    return result.rows[0];
  }

  static async getEmployeeTaskStats(employee_id) {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 ELSE 0 END) as overdue
       FROM tasks
       WHERE employee_id = $1`,
      [employee_id]
    );
    return result.rows[0];
  }
}

module.exports = Task;
