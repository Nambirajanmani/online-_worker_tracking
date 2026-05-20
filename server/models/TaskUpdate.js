const { pool } = require("../config/database");

class TaskUpdate {
  static async create({ task_id, employee_id, comment, file, status }) {
    const result = await pool.query(
      `INSERT INTO task_updates (task_id, employee_id, comment, file, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [task_id, employee_id, comment, file, status]
    );
    return result.rows[0];
  }

  static async findByTaskId(task_id) {
    const result = await pool.query(
      `SELECT tu.*, e.first_name, e.last_name, e.employee_code
       FROM task_updates tu
       LEFT JOIN employees e ON tu.employee_id = e.id
       WHERE tu.task_id = $1
       ORDER BY tu.created_at DESC`,
      [task_id]
    );
    return result.rows;
  }

  static async delete(id) {
    const result = await pool.query(
      `DELETE FROM task_updates WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = TaskUpdate;
