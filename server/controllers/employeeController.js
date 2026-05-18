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
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, message: "Email, password, first name and last name are required" });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const user = await User.create({ email, password, role: "employee" });
    const employee = await Employee.create(req.body, user.id);

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

    res.status(201).json({ success: true, data: employee });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const updatedEmployee = await Employee.update(req.params.id, req.body);
    res.json({ success: true, data: updatedEmployee });
  } catch (error) {
    console.error(error);
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

module.exports = {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  getProfile,
  updateProfile,
  getEmployeeStats
};
