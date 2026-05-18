const moment = require("moment");
const { pool } = require("../config/database");

const getLeaveRequests = async (req, res) => {
  try {
    const employeeId = req.user.role === "admin" ? req.query.employeeId : req.user.employee_id;
    let query = `
      SELECT l.*,
             CONCAT(e.first_name, ' ', e.last_name) AS employee_name
      FROM leave_requests l
      JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];
    let index = 1;

    if (employeeId) {
      query += ` AND l.employee_id = $${index++}`;
      params.push(employeeId);
    }
    if (req.query.status) {
      query += ` AND l.status = $${index++}`;
      params.push(req.query.status);
    }
    query += " ORDER BY l.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getLeaveBalances = async (req, res) => {
  const balances = { annual: 20, sick: 12, personal: 5 };
  res.json({ success: true, data: balances });
};

const createLeaveRequest = async (req, res) => {
  try {
    const start = moment(req.body.start_date);
    const end = moment(req.body.end_date);
    const totalDays = end.diff(start, "days") + 1;

    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, total_days, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [req.user.employee_id, req.body.leave_type, req.body.start_date, req.body.end_date, totalDays, req.body.reason]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateLeaveStatus = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE leave_requests
       SET status = $1, approved_by = $2, comments = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [req.body.status, req.user.employee_id, req.body.comments || null, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const cancelLeaveRequest = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE leave_requests
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND employee_id = $2
       RETURNING *`,
      [req.params.id, req.user.employee_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: "Leave request not found or unauthorized" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getLeaveRequests, getLeaveBalances, createLeaveRequest, updateLeaveStatus, cancelLeaveRequest };
