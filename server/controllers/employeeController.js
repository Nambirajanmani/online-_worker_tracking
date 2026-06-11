const { pool } = require("../config/database");
const Employee = require("../models/Employee");
const User = require("../models/User");
const { sendWelcomeEmail } = require("../utils/sendEmail");

const getEmployees = async (req, res) => {
  try {
    const { department, status, search } = req.query;
    let employees = await Employee.findAll({ department, status });

    if (search) {
      const normalized = search.toLowerCase();
      employees = employees.filter((employee) =>
        `${employee.first_name} ${employee.last_name} ${employee.email} ${employee.employee_code}`
          .toLowerCase()
          .includes(normalized)
      );
    }

    res.json({ success: true, data: employees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { email, password, firstName, lastName, employeeCode, department } = req.body;
    if (!email || !password || !firstName || !lastName || !employeeCode) {
      return res.status(400).json({ success: false, message: "Email, password, first name, last name and employee ID are required" });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const existingEmployee = await Employee.findByEmployeeCode(employeeCode);
    if (existingEmployee) {
      return res.status(400).json({ success: false, message: "Employee ID already exists" });
    }

    const role = department === "Management" ? "admin" : "employee";
    const user = await User.create({ email, password, role });
    const employee = await Employee.create(req.body, user.id);
    const fullEmployee = await Employee.findById(employee.id);

    try {
      await sendWelcomeEmail(email, firstName, password);
    } catch (error) {
      console.warn("Welcome email failed", error.message);
    }

    if (req.user?.employee_id) {
      await pool.query(
        `INSERT INTO activity_logs (employee_id, activity_type, description, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [req.user.employee_id, "create_employee", `Created employee ${firstName} ${lastName}`, req.ip]
      );
    }

    res.status(201).json({ success: true, data: fullEmployee });
  } catch (error) {
    console.error(error);
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      const isCode = error.detail?.includes("employee_code") || error.message?.includes("employee_code");
      return res.status(400).json({ success: false, message: isCode ? "Employee ID already exists" : "Email already exists" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (req.body.employeeCode && req.body.employeeCode !== employee.employee_code) {
      const existingEmployee = await Employee.findByEmployeeCode(req.body.employeeCode);
      if (existingEmployee) {
        return res.status(400).json({ success: false, message: "Employee ID already exists" });
      }
    }

    const { department } = req.body;
    if (department !== undefined) {
      const newRole = department === "Management" ? "admin" : "employee";
      await pool.query(
        "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newRole, employee.user_id]
      );
    }

    const updatedEmployee = await Employee.update(req.params.id, req.body);
    res.json({ success: true, data: updatedEmployee });
  } catch (error) {
    console.error(error);
    if (error.code === "23505" || error.message?.includes("unique constraint")) {
      const isCode = error.detail?.includes("employee_code") || error.message?.includes("employee_code");
      return res.status(400).json({ success: false, message: isCode ? "Employee ID already exists" : "Email already exists" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const deleted = await Employee.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const employee = await Employee.findByUserId(req.user.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    res.json({ success: true, data: employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const employee = await Employee.findByUserId(req.user.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }
    const updated = await Employee.update(employee.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getEmployeeStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_employees,
        COUNT(CASE WHEN u.is_active = true THEN 1 END)::int AS active_employees
      FROM employees e
      JOIN users u ON e.user_id = u.id
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const toggleEmployeeStatus = async (req, res) => {
  try {
    const employeeId = req.params.id;

    if (!employeeId || isNaN(parseInt(employeeId, 10))) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const newStatus = !employee.is_active;
    await User.updateIsActive(employee.user_id, newStatus);

    const updatedEmployee = await Employee.findById(employeeId);

    if (req.user?.employee_id) {
      await pool.query(
        `INSERT INTO activity_logs (employee_id, activity_type, description, ip_address)
         VALUES ($1, $2, $3, $4)`,
        [
          req.user.employee_id,
          "toggle_employee_status",
          `Changed employee ${employee.first_name} ${employee.last_name} status to ${newStatus ? "Active" : "Inactive"}`,
          req.ip
        ]
      );
    }

    return res.json({ success: true, data: updatedEmployee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  getProfile,
  updateProfile,
  getEmployeeStats,
  toggleEmployeeStatus
};