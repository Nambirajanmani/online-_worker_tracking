const { pool } = require("../config/database");

class ActivityLog {
  static async create(logData) {
    const {
      session_id,
      employee_id,
      activity_type,
      description,
      ip_address,
      user_agent
    } = logData;

    const result = await pool.query(
      `INSERT INTO activity_logs (
        session_id, employee_id, activity_type, description, ip_address, user_agent, timestamp, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [session_id, employee_id, activity_type, description, ip_address, user_agent]
    );
    return result.rows[0];
  }

  static async findBySessionId(sessionId) {
    const result = await pool.query(
      `SELECT * FROM activity_logs WHERE session_id = $1 ORDER BY timestamp ASC`,
      [sessionId]
    );
    return result.rows;
  }
}

module.exports = ActivityLog;
