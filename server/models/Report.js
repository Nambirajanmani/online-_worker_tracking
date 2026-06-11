const { pool } = require("../config/database");

class Report {
  static async create(reportData) {
    const {
      employeeId,
      employeeName,
      department,
      title,
      description,
      reportType,
      priority,
      attachment,
    } = reportData;

    const reportId = `RPT${Date.now()}`;
    const result = await pool.query(
      `INSERT INTO reports (
        report_id, employee_id, employee_name, department, title, 
        description, report_type, priority, attachment, status, 
        admin_remarks, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        reportId,
        employeeId,
        employeeName,
        department,
        title,
        description,
        reportType,
        priority,
        attachment || null,
        "Pending",
        "",
        new Date(),
        new Date(),
      ]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT * FROM reports WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByReportId(reportId) {
    const result = await pool.query(
      `SELECT * FROM reports WHERE report_id = $1`,
      [reportId]
    );
    return result.rows[0];
  }

  static async findByEmployeeId(employeeId, { limit = 10, offset = 0 } = {}) {
    const result = await pool.query(
      `SELECT * FROM reports 
       WHERE employee_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [employeeId, limit, offset]
    );
    return result.rows;
  }

  static async findByEmployeeIdCount(employeeId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM reports WHERE employee_id = $1`,
      [employeeId]
    );
    return parseInt(result.rows[0].count);
  }

  static async findAll({
    status,
    department,
    employeeId,
    search,
    limit = 10,
    offset = 0,
  } = {}) {
    let query = `SELECT * FROM reports WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (employeeId) {
      query += ` AND employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR report_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findAllCount({
    status,
    department,
    employeeId,
    search,
  } = {}) {
    let query = `SELECT COUNT(*) as count FROM reports WHERE 1=1`;
    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (department) {
      query += ` AND department = $${paramCount}`;
      params.push(department);
      paramCount++;
    }

    if (employeeId) {
      query += ` AND employee_id = $${paramCount}`;
      params.push(employeeId);
      paramCount++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR report_id ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  static async update(id, updateData) {
    const { status, adminRemarks } = updateData;
    const result = await pool.query(
      `UPDATE reports 
       SET status = COALESCE($1, status), 
           admin_remarks = COALESCE($2, admin_remarks),
           updated_at = $3
       WHERE id = $4
       RETURNING *`,
      [status || null, adminRemarks || null, new Date(), id]
    );
    return result.rows[0];
  }

  static async getStatistics() {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Review' THEN 1 ELSE 0 END) as in_review,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END) as rejected
       FROM reports`
    );
    return result.rows[0];
  }

  static async delete(id) {
    const result = await pool.query(
      `DELETE FROM reports WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
}

module.exports = Report;
