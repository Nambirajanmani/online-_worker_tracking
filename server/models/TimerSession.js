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

  static async getLiveMonitoringData(dateStr = new Date().toISOString().split("T")[0]) {
    const result = await pool.query(
      `SELECT 
        e.id as employee_id,
        TRIM(CONCAT(e.first_name, ' ', e.last_name)) as employee_name,
        e.employee_code,
        e.department,
        e.position,
        e.profile_pic,
        u.email,
        u.role,
        COALESCE(daily.today_total_duration, 0) as today_total_duration,
        COALESCE(daily.today_active_duration, 0) as today_active_duration,
        COALESCE(daily.today_idle_duration, 0) as today_idle_duration,
        COALESCE(daily.today_break_duration, 0) as today_break_duration,
        active.id as active_session_id,
        active.task_id as active_task_id,
        active.task_name as active_task_name,
        active.project_name as active_project_name,
        active.start_time as active_start_time,
        active.status as active_status,
        active.notes as active_notes,
        active.total_duration as active_total_duration,
        active.active_duration as active_active_duration,
        active.updated_at as active_updated_at,
        latest.id as latest_session_id,
        latest.task_id as latest_task_id,
        latest.task_name as latest_task_name,
        latest.project_name as latest_project_name,
        latest.start_time as latest_start_time,
        latest.end_time as latest_end_time,
        latest.status as latest_status,
        latest.notes as latest_notes
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN (
        SELECT 
          employee_id,
          SUM(COALESCE(total_duration, 0)) as today_total_duration,
          SUM(COALESCE(active_duration, 0)) as today_active_duration,
          SUM(COALESCE(idle_duration, 0)) as today_idle_duration,
          SUM(COALESCE(break_duration, 0)) as today_break_duration
        FROM timer_sessions
        WHERE DATE(start_time) = $1
        GROUP BY employee_id
      ) daily ON e.id = daily.employee_id
      LEFT JOIN (
        SELECT DISTINCT ON (employee_id) *
        FROM timer_sessions
        WHERE status IN ('running', 'paused', 'idle')
        ORDER BY employee_id, created_at DESC
      ) active ON e.id = active.employee_id
      LEFT JOIN (
        SELECT DISTINCT ON (employee_id) *
        FROM timer_sessions
        WHERE DATE(start_time) = $1
        ORDER BY employee_id, created_at DESC
      ) latest ON e.id = latest.employee_id
      WHERE u.is_active = true AND (u.role = 'employee' OR active.id IS NOT NULL OR daily.today_total_duration > 0)
      ORDER BY (active.id IS NOT NULL) DESC, daily.today_total_duration DESC, e.id ASC`,
      [dateStr]
    );

    const now = new Date();
    return result.rows.map((row) => {
      const hasActive = Boolean(row.active_session_id);
      let runningElapsed = 0;

      if (hasActive && row.active_status === "running") {
        const anchor = row.active_updated_at || row.active_start_time;
        const startedAt = anchor ? new Date(anchor) : null;
        if (startedAt && !Number.isNaN(startedAt.getTime())) {
          runningElapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
        }
      }

      const activeDurationBase = hasActive
        ? Number(row.active_active_duration || 0) + (row.active_status === "running" ? runningElapsed : 0)
        : 0;

      const currentSessionTotal = hasActive
        ? Number(row.active_total_duration || 0) + runningElapsed
        : 0;

      const todayTotalSeconds = Number(row.today_total_duration || 0) + runningElapsed;
      const todayActiveSeconds =
        Number(row.today_active_duration || 0) + (row.active_status === "running" ? runningElapsed : 0);
      const todayIdleSeconds = Number(row.today_idle_duration || 0);
      const todayBreakSeconds = Number(row.today_break_duration || 0);

      const status = hasActive
        ? row.active_status
        : row.latest_session_id
          ? row.latest_status || "completed"
          : "offline";

      const sessionId = hasActive ? row.active_session_id : row.latest_session_id || null;
      const taskName = hasActive
        ? row.active_task_name
        : row.latest_task_name || "No active task";
      const projectName = hasActive
        ? row.active_project_name
        : row.latest_project_name || null;
      const notes = hasActive ? row.active_notes : row.latest_notes || null;
      const startTime = hasActive ? row.active_start_time : row.latest_start_time || null;
      const endTime = hasActive ? null : row.latest_end_time || null;

      return {
        id: sessionId || row.employee_id,
        session_id: sessionId,
        employee_id: row.employee_id,
        employee_name: row.employee_name || row.email,
        employee_code: row.employee_code,
        department: row.department,
        position: row.position,
        profile_pic: row.profile_pic,
        email: row.email,
        status,
        task_name: taskName,
        project_name: projectName,
        notes,
        start_time: startTime,
        end_time: endTime,
        has_active_timer: hasActive,
        elapsed_seconds: activeDurationBase,
        current_session_duration: currentSessionTotal,
        today_total_duration: todayTotalSeconds,
        today_active_duration: todayActiveSeconds,
        today_idle_duration: todayIdleSeconds,
        today_break_duration: todayBreakSeconds,
      };
    });
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
