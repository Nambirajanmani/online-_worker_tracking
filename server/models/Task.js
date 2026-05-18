const { pool } = require("../config/database");

class Task {
  static async create(taskData) {
    const { title, description, assignedBy, assignedTo, projectId, priority, dueDate, estimatedHours } = taskData;
    const result = await pool.query(
      `INSERT INTO tasks (
        title, description, assigned_by, assigned_to, project_id, priority, due_date, estimated_hours, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *`,
      [title, description, assignedBy, assignedTo, projectId || null, priority, dueDate || null, estimatedHours || null]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT t.*,
              CONCAT(assigner.first_name, ' ', assigner.last_name) AS assigned_by_name,
              CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
              p.name AS project_name
       FROM tasks t
       LEFT JOIN employees assigner ON t.assigned_by = assigner.id
       LEFT JOIN employees assignee ON t.assigned_to = assignee.id
       LEFT JOIN projects p ON t.project_id = p.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT t.*,
             CONCAT(assigner.first_name, ' ', assigner.last_name) AS assigned_by_name,
             CONCAT(assignee.first_name, ' ', assignee.last_name) AS assigned_to_name,
             p.name AS project_name
      FROM tasks t
      LEFT JOIN employees assigner ON t.assigned_by = assigner.id
      LEFT JOIN employees assignee ON t.assigned_to = assignee.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.assigned_to) {
      query += ` AND t.assigned_to = $${paramIndex++}`;
      params.push(filters.assigned_to);
    }
    if (filters.status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    if (filters.priority) {
      query += ` AND t.priority = $${paramIndex++}`;
      params.push(filters.priority);
    }

    query += " ORDER BY t.due_date ASC NULLS LAST, t.priority DESC";
    const result = await pool.query(query, params);
    return result.rows;
  }

  static async updateStatus(id, status, completedAt = null) {
    const fields = ["status = $1", "updated_at = CURRENT_TIMESTAMP"];
    const params = [status];

    if (status === "completed") {
      fields.push(`completed_at = $${params.length + 1}`);
      params.push(completedAt || new Date());
    } else {
      fields.push("completed_at = NULL");
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1 RETURNING id", [id]);
    return Boolean(result.rows.length);
  }
}

module.exports = Task;
