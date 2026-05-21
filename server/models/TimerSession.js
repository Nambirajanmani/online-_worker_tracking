const { pool } = require("../config/database");

class TimerSession {
  static async create(sessionData) {
    const {
      employee_id,
      employee_name,
      task_id,
      task_name,
      project_name
    } = sessionData;

    const result = await pool.query(
      `INSERT INTO timer_sessions (
        employee_id, employee_name, task_id, task_name, project_name, start_time, status
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, 'running')
      RETURNING *`,
      [employee_id, employee_name, task_id, task_name, project_name]
    );
    return result.rows[0];
  }

  static async findActiveByEmployeeId(employeeId) {
    const result = await pool.query(
      `SELECT * FROM timer_sessions 
       WHERE employee_id = $1 AND status IN ('running', 'paused', 'idle')`,
      [employeeId]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM timer_sessions WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }
  
  static async findActiveSessions() {
    const result = await pool.query(
      `SELECT t.*, e.profile_pic 
       FROM timer_sessions t
       LEFT JOIN employees e ON t.employee_id = e.id
       WHERE t.status IN ('running', 'paused', 'idle')`
    );
    return result.rows;
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    });

    if (fields.length === 0) return null;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const query = `UPDATE timer_sessions SET ${fields.join(", ")} WHERE id = $${paramIndex} RETURNING *`;
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async getHistoryByEmployee(employeeId) {
    const result = await pool.query(
      `SELECT * FROM timer_sessions 
       WHERE employee_id = $1 
       ORDER BY created_at DESC`,
      [employeeId]
    );
    return result.rows;
  }
  
  static async getDailySummary(employeeId, dateStr) {
    // dateStr format 'YYYY-MM-DD'
    const result = await pool.query(
      `SELECT COALESCE(SUM(total_duration), 0) as total_duration,
              COALESCE(SUM(active_duration), 0) as active_duration,
              COALESCE(SUM(idle_duration), 0) as idle_duration
       FROM timer_sessions
       WHERE employee_id = $1 AND DATE(start_time) = $2 AND status IN ('completed', 'stopped')`,
      [employeeId, dateStr]
    );
    return result.rows[0];
  }
}

module.exports = TimerSession;
