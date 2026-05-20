const moment = require("moment");
const path = require("path");
const fs = require("fs");
const { pool } = require("../config/database");

const LEAVE_TYPES = ["sick", "casual", "emergency", "paid", "unpaid"];

const emitLeave = (event, payload) => {
  if (global.io) {
    global.io.to("admin_room").emit(event, payload);
  }
};

const emitToEmployeeUser = async (employeeId, event, payload) => {
  if (!global.io || !employeeId) return;
  const r = await pool.query("SELECT user_id FROM employees WHERE id = $1", [employeeId]);
  const userId = r.rows[0]?.user_id;
  if (userId) {
    global.io.to(`user_${userId}`).emit(event, payload);
  }
};

const shapeLeaveRow = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    employee_id: row.employee_id,
    employee_code: row.employee_code,
    employee_name: row.employee_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    leave_type: row.leave_type,
    start_date: row.start_date,
    end_date: row.end_date,
    from_date: row.start_date,
    to_date: row.end_date,
    total_days: row.total_days,
    reason: row.reason,
    attachment_url: row.attachment_url,
    attachment: row.attachment_url,
    status: row.status,
    admin_remark: row.admin_remark ?? row.comments,
    comments: row.comments,
    applied_at: row.created_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    approved_by: row.approved_by,
    approved_at: row.approved_at
  };
};

const saveLeaveAttachment = async (req) => {
  const file = req.files?.attachment || req.files?.certificate || req.files?.file;
  if (!file || !file.name) return null;
  const uploadRoot = path.resolve(__dirname, "..", process.env.UPLOAD_PATH || "./uploads");
  const dir = path.join(uploadRoot, "leaves");
  await fs.promises.mkdir(dir, { recursive: true });
  const safe = `${Date.now()}_${String(file.name).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const dest = path.join(dir, safe);
  await file.mv(dest);
  return `/uploads/leaves/${safe}`;
};

const hasOverlap = async (client, employeeId, startDate, endDate, excludeId = null) => {
  const q = `
    SELECT id FROM leave_requests
    WHERE employee_id = $1
      AND status IN ('pending', 'approved')
      AND ($4::int IS NULL OR id <> $4)
      AND daterange(start_date::date, end_date::date, '[]') && daterange($2::date, $3::date, '[]')
    LIMIT 1
  `;
  const res = await client.query(q, [employeeId, startDate, endDate, excludeId]);
  return res.rows.length > 0;
};

const getLeaveRequests = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const employeeId = isAdmin ? req.query.employeeId : req.user.employee_id;

    let query = `
      SELECT l.*,
             e.employee_code,
             e.first_name,
             e.last_name
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
    if (req.query.leaveType) {
      query += ` AND l.leave_type = $${index++}`;
      params.push(req.query.leaveType);
    }
    if (req.query.search) {
      query += ` AND (
        e.first_name ILIKE $${index}
        OR e.last_name ILIKE $${index}
        OR e.employee_code ILIKE $${index}
        OR l.employee_name ILIKE $${index}
        OR CONCAT(e.first_name, ' ', e.last_name) ILIKE $${index}
      )`;
      params.push(`%${req.query.search}%`);
      index += 1;
    }
    if (req.query.dateFrom) {
      query += ` AND l.start_date >= $${index++}`;
      params.push(req.query.dateFrom);
    }
    if (req.query.dateTo) {
      query += ` AND l.end_date <= $${index++}`;
      params.push(req.query.dateTo);
    }
    if (req.query.appliedFrom) {
      query += ` AND l.created_at::date >= $${index++}`;
      params.push(req.query.appliedFrom);
    }
    if (req.query.appliedTo) {
      query += ` AND l.created_at::date <= $${index++}`;
      params.push(req.query.appliedTo);
    }

    query += " ORDER BY l.created_at DESC";

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows.map(shapeLeaveRow) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getLeaveStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
        COUNT(*) FILTER (
          WHERE status = 'approved'
            AND CURRENT_DATE BETWEEN start_date AND end_date
        )::int AS on_leave_today
      FROM leave_requests
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getLeaveBalances = async (req, res) => {
  const balances = { sick: 12, casual: 8, emergency: 3, paid: 15, unpaid: 0 };
  res.json({ success: true, data: balances });
};

const createLeaveRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.user.employee_id) {
      return res.status(400).json({ success: false, message: "No employee profile linked to this account" });
    }

    const leaveType = (req.body.leave_type || "").toLowerCase().trim();
    const startRaw = req.body.from_date || req.body.start_date;
    const endRaw = req.body.to_date || req.body.end_date;
    const reason = (req.body.reason || "").trim();

    if (!LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({ success: false, message: "Invalid leave type" });
    }
    if (!startRaw || !endRaw) {
      return res.status(400).json({ success: false, message: "From date and to date are required" });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    const start = moment(startRaw, "YYYY-MM-DD", true);
    const end = moment(endRaw, "YYYY-MM-DD", true);
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }
    if (start.isAfter(end)) {
      return res.status(400).json({ success: false, message: "From date cannot be after to date" });
    }

    const startDate = start.format("YYYY-MM-DD");
    const endDate = end.format("YYYY-MM-DD");
    const totalDays = end.diff(start, "days") + 1;

    const emp = await client.query(
      "SELECT id, employee_code, first_name, last_name FROM employees WHERE id = $1",
      [req.user.employee_id]
    );
    if (!emp.rows.length) {
      return res.status(400).json({ success: false, message: "Employee not found" });
    }

    const overlap = await hasOverlap(client, req.user.employee_id, startDate, endDate, null);
    if (overlap) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending or approved leave that overlaps these dates"
      });
    }

    let attachmentUrl = null;
    try {
      attachmentUrl = await saveLeaveAttachment(req);
    } catch (fileErr) {
      console.error(fileErr);
      return res.status(400).json({ success: false, message: "Failed to save attachment" });
    }

    const employeeName = `${emp.rows[0].first_name} ${emp.rows[0].last_name}`.trim();

    const result = await client.query(
      `INSERT INTO leave_requests (
        employee_id, employee_name, leave_type, start_date, end_date, total_days,
        reason, attachment_url, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [req.user.employee_id, employeeName, leaveType, startDate, endDate, totalDays, reason, attachmentUrl]
    );

    const row = result.rows[0];
    const full = await client.query(
      `SELECT l.*, e.employee_code, e.first_name, e.last_name
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = $1`,
      [row.id]
    );
    const shaped = shapeLeaveRow(full.rows[0]);

    emitLeave("leave:created", { leave: shaped });
    await emitToEmployeeUser(req.user.employee_id, "leave:sync", { leave: shaped });

    res.status(201).json({ success: true, data: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

const updateEmployeeLeaveRequest = async (req, res) => {
  const client = await pool.connect();
  try {
    if (!req.user.employee_id) {
      return res.status(400).json({ success: false, message: "No employee profile" });
    }

    const existing = await client.query(
      "SELECT * FROM leave_requests WHERE id = $1 AND employee_id = $2",
      [req.params.id, req.user.employee_id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }
    if (existing.rows[0].status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending requests can be edited" });
    }

    const leaveType = (req.body.leave_type || existing.rows[0].leave_type).toLowerCase().trim();
    const startRaw = req.body.from_date || req.body.start_date || existing.rows[0].start_date;
    const endRaw = req.body.to_date || req.body.end_date || existing.rows[0].end_date;
    const reason = (req.body.reason ?? existing.rows[0].reason).toString().trim();

    if (!LEAVE_TYPES.includes(leaveType)) {
      return res.status(400).json({ success: false, message: "Invalid leave type" });
    }
    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason is required" });
    }

    const start = moment(startRaw, "YYYY-MM-DD", true);
    const end = moment(endRaw, "YYYY-MM-DD", true);
    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({ success: false, message: "Invalid date format" });
    }
    if (start.isAfter(end)) {
      return res.status(400).json({ success: false, message: "From date cannot be after to date" });
    }

    const startDate = start.format("YYYY-MM-DD");
    const endDate = end.format("YYYY-MM-DD");
    const totalDays = end.diff(start, "days") + 1;

    const overlap = await hasOverlap(client, req.user.employee_id, startDate, endDate, Number(req.params.id));
    if (overlap) {
      return res.status(400).json({
        success: false,
        message: "Another leave overlaps these dates"
      });
    }

    let newAttachment = null;
    if (req.files?.attachment || req.files?.certificate || req.files?.file) {
      try {
        newAttachment = await saveLeaveAttachment(req);
      } catch (fileErr) {
        console.error(fileErr);
        return res.status(400).json({ success: false, message: "Failed to save attachment" });
      }
    }

    const emp = await client.query(
      "SELECT first_name, last_name FROM employees WHERE id = $1",
      [req.user.employee_id]
    );
    const employeeName = `${emp.rows[0].first_name} ${emp.rows[0].last_name}`.trim();

    const result = await client.query(
      `UPDATE leave_requests
       SET leave_type = $1, start_date = $2, end_date = $3, total_days = $4,
           reason = $5, attachment_url = COALESCE($6, attachment_url),
           employee_name = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 AND employee_id = $9 AND status = 'pending'
       RETURNING *`,
      [leaveType, startDate, endDate, totalDays, reason, newAttachment, employeeName, req.params.id, req.user.employee_id]
    );

    if (!result.rows.length) {
      return res.status(400).json({ success: false, message: "Update failed" });
    }

    const full = await client.query(
      `SELECT l.*, e.employee_code, e.first_name, e.last_name
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = $1`,
      [req.params.id]
    );
    const shaped = shapeLeaveRow(full.rows[0]);

    emitLeave("leave:updated", { leave: shaped });
    await emitToEmployeeUser(req.user.employee_id, "leave:sync", { leave: shaped });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

const updateLeaveStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const status = (req.body.status || "").toLowerCase().trim();
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be approved or rejected" });
    }

    const adminRemark = (req.body.admin_remark ?? req.body.comments ?? "").toString().trim() || null;

    const existing = await client.query("SELECT * FROM leave_requests WHERE id = $1", [req.params.id]);
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: "Leave request not found" });
    }
    if (existing.rows[0].status !== "pending") {
      return res.status(400).json({ success: false, message: "Request is no longer pending" });
    }

    const result = await client.query(
      `UPDATE leave_requests
       SET status = $1,
           approved_by = $2,
           approved_at = CURRENT_TIMESTAMP,
           admin_remark = $3,
           comments = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [status, req.user.employee_id || null, adminRemark, req.params.id]
    );

    const row = result.rows[0];
    const full = await client.query(
      `SELECT l.*, e.employee_code, e.first_name, e.last_name
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = $1`,
      [row.id]
    );
    const shaped = shapeLeaveRow(full.rows[0]);

    const userRes = await client.query("SELECT user_id FROM employees WHERE id = $1", [row.employee_id]);
    const userId = userRes.rows[0]?.user_id;
    if (userId) {
      const title = status === "approved" ? "Leave approved" : "Leave rejected";
      const message =
        status === "approved"
          ? `Your leave from ${shaped.from_date} to ${shaped.to_date} was approved.`
          : `Your leave from ${shaped.from_date} to ${shaped.to_date} was rejected.`;
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, is_read)
         VALUES ($1, $2, $3, 'leave', false)`,
        [userId, title, message]
      );
    }

    emitLeave("leave:updated", { leave: shaped });
    await emitToEmployeeUser(row.employee_id, "leave:status", { leave: shaped, status });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

const cancelLeaveRequest = async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT * FROM leave_requests WHERE id = $1 AND employee_id = $2",
      [req.params.id, req.user.employee_id]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, message: "Leave request not found or unauthorized" });
    }
    if (existing.rows[0].status !== "pending") {
      return res.status(400).json({ success: false, message: "Only pending requests can be cancelled" });
    }

    await pool.query(
      `UPDATE leave_requests
       SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND employee_id = $2
       RETURNING *`,
      [req.params.id, req.user.employee_id]
    );

    const full = await pool.query(
      `SELECT l.*, e.employee_code, e.first_name, e.last_name
       FROM leave_requests l
       JOIN employees e ON l.employee_id = e.id
       WHERE l.id = $1`,
      [req.params.id]
    );
    const shaped = shapeLeaveRow(full.rows[0]);

    emitLeave("leave:updated", { leave: shaped });
    await emitToEmployeeUser(req.user.employee_id, "leave:sync", { leave: shaped });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getLeaveRequests,
  getLeaveStats,
  getLeaveBalances,
  createLeaveRequest,
  updateEmployeeLeaveRequest,
  updateLeaveStatus,
  cancelLeaveRequest
};
