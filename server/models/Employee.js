const { pool } = require("../config/database");

class Employee {
  static async create(employeeData, userId) {
    const {
      employeeCode,
      firstName,
      lastName,
      department,
      position,
      phone,
      address,
      joiningDate,
      salary,
      reportingManager
    } = employeeData;

    const result = await pool.query(
      `INSERT INTO employees (
        user_id, employee_code, first_name, last_name, department, position, phone, address, joining_date, salary, reporting_manager
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        userId,
        employeeCode,
        firstName,
        lastName,
        department,
        position,
        phone,
        address,
        joiningDate || null,
        salary || null,
        reportingManager || null
      ]
    );
    return result.rows[0];
  }

  static async findByEmployeeCode(employeeCode) {
    const result = await pool.query(
      `SELECT e.*, u.email, u.is_active, u.role
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.employee_code = $1`,
      [employeeCode]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT e.*, u.email, u.is_active, u.last_login, u.role
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async findByUserId(userId) {
    const result = await pool.query(
      `SELECT e.*, u.email, u.is_active, u.role
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT e.*, u.email, u.is_active, u.last_login, u.role
      FROM employees e
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.department) {
      query += ` AND e.department = $${paramIndex++}`;
      params.push(filters.department);
    }

    if (typeof filters.status !== "undefined" && filters.status !== "") {
      query += ` AND u.is_active = $${paramIndex++}`;
      params.push(filters.status === "active" || filters.status === true);
    }

    query += " ORDER BY e.created_at DESC";

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async update(id, updates) {
    const fieldMap = {
      employeeCode: "employee_code",
      firstName: "first_name",
      lastName: "last_name",
      department: "department",
      position: "position",
      phone: "phone",
      address: "address",
      salary: "salary",
      joiningDate: "joining_date",
      reportingManager: "reporting_manager"
    };

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(fieldMap).forEach(([inputField, dbField]) => {
      if (typeof updates[inputField] !== "undefined") {
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(updates[inputField]);
      }
    });

    if (!setClauses.length) {
      return this.findById(id);
    }

    setClauses.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await pool.query(
      `UPDATE employees SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return this.findById(id);
  }

  static async delete(id) {
    const employee = await this.findById(id);
    if (!employee) {
      return false;
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Delete notifications referencing the user
      await client.query("DELETE FROM notifications WHERE user_id = $1", [employee.user_id]);

      // 2. Delete references to this employee in non-cascading tables
      await client.query("DELETE FROM time_entries WHERE employee_id = $1", [id]);
      await client.query("DELETE FROM leave_requests WHERE employee_id = $1", [id]);
      await client.query("DELETE FROM activity_logs WHERE employee_id = $1", [id]);

      // 3. Nullify references where the employee is an author/manager/approver
      await client.query("UPDATE projects SET created_by = NULL WHERE created_by = $1", [id]);
      await client.query("UPDATE tasks SET assigned_by = NULL WHERE assigned_by = $1", [id]);
      await client.query("UPDATE leave_requests SET approved_by = NULL WHERE approved_by = $1", [id]);
      await client.query("UPDATE employees SET reporting_manager = NULL WHERE reporting_manager = $1", [id]);

      // 4. Delete the user (this cascades to employees, attendance, tasks, reports, etc.)
      await client.query("DELETE FROM users WHERE id = $1", [employee.user_id]);

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Employee;
