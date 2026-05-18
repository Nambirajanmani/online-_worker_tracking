const moment = require("moment");
const { pool } = require("../config/database");

const calculateHours = (clockIn, clockOut) => {
  const start = moment(clockIn, "HH:mm:ss");
  const end = moment(clockOut, "HH:mm:ss");
  return Number(moment.duration(end.diff(start)).asHours().toFixed(2));
};

const clockIn = async (req, res) => {
  try {
    const employeeId = req.user.role === "admin" ? req.body.employeeId : req.user.employee_id;
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");
    const existing = await pool.query("SELECT * FROM attendance WHERE employee_id = $1 AND date = $2", [employeeId, today]);

    if (existing.rows[0]?.clock_in_time) {
      return res.status(400).json({ success: false, message: "Already clocked in today" });
    }

    const status = currentTime > "09:30:00" ? "late" : "present";
    const result = await pool.query(
      `INSERT INTO attendance (employee_id, date, clock_in_time, status)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (employee_id, date)
       DO UPDATE SET clock_in_time = EXCLUDED.clock_in_time, status = EXCLUDED.status
       RETURNING *`,
      [employeeId, today, currentTime, status]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const clockOut = async (req, res) => {
  try {
    const employeeId = req.user.role === "admin" ? req.body.employeeId : req.user.employee_id;
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");
    const attendance = await pool.query("SELECT * FROM attendance WHERE employee_id = $1 AND date = $2", [employeeId, today]);

    if (!attendance.rows[0]?.clock_in_time) {
      return res.status(400).json({ success: false, message: "Not clocked in yet" });
    }
    if (attendance.rows[0]?.clock_out_time) {
      return res.status(400).json({ success: false, message: "Already clocked out" });
    }

    const totalHours = calculateHours(attendance.rows[0].clock_in_time, currentTime);
    const overtimeHours = Math.max(0, totalHours - 8);

    const result = await pool.query(
      `UPDATE attendance
       SET clock_out_time = $1, total_hours = $2, overtime_hours = $3
       WHERE employee_id = $4 AND date = $5
       RETURNING *`,
      [currentTime, totalHours, overtimeHours, employeeId, today]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");

    if (req.user.role === "admin" && !req.query.employeeId) {
      const result = await pool.query(
        "SELECT COUNT(DISTINCT employee_id)::int AS count FROM attendance WHERE date = $1 AND clock_in_time IS NOT NULL",
        [today]
      );
      return res.json({ success: true, data: result.rows[0] });
    }

    const employeeId = req.user.role === "admin" ? req.query.employeeId : req.user.employee_id;
    const result = await pool.query("SELECT * FROM attendance WHERE employee_id = $1 AND date = $2", [employeeId, today]);
    return res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const employeeId = req.user.role === "admin" ? req.params.employeeId || req.query.employeeId : req.user.employee_id;
    let query = "SELECT * FROM attendance WHERE 1=1";
    const params = [];
    let index = 1;

    if (employeeId) {
      query += ` AND employee_id = $${index++}`;
      params.push(employeeId);
    }

    if (req.query.startDate && req.query.endDate) {
      query += ` AND date BETWEEN $${index++} AND $${index++}`;
      params.push(req.query.startDate, req.query.endDate);
    } else {
      query += " AND date >= CURRENT_DATE - INTERVAL '30 days'";
    }

    query += " ORDER BY date DESC";
    const result = await pool.query(query, params);

    const summary = {
      totalDays: result.rows.length,
      presentDays: result.rows.filter((row) => row.status === "present").length,
      absentDays: result.rows.filter((row) => row.status === "absent").length,
      lateDays: result.rows.filter((row) => row.status === "late").length,
      totalHours: result.rows.reduce((sum, row) => sum + Number(row.total_hours || 0), 0)
    };

    res.json({ success: true, data: result.rows, summary });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAttendanceSummary = async (req, res) => {
  try {
    const startDate = req.query.startDate || moment().startOf("month").format("YYYY-MM-DD");
    const endDate = req.query.endDate || moment().format("YYYY-MM-DD");
    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT e.id)::int AS total_employees,
         COUNT(CASE WHEN a.status = 'present' THEN 1 END)::int AS present_count,
         COUNT(CASE WHEN a.status = 'absent' THEN 1 END)::int AS absent_count,
         COUNT(CASE WHEN a.status = 'late' THEN 1 END)::int AS late_count,
         COALESCE(AVG(a.total_hours), 0) AS avg_hours
       FROM employees e
       LEFT JOIN attendance a ON e.id = a.employee_id AND a.date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getTimeSummary = async (req, res) => {
  try {
    const period = req.query.period || "week";
    const employeeId = req.user.employee_id;
    const startDate =
      period === "month"
        ? moment().startOf("month").format("YYYY-MM-DD")
        : moment().startOf("week").format("YYYY-MM-DD");

    const result = await pool.query(
      `SELECT COALESCE(SUM(duration), 0) AS total_hours
       FROM time_entries
       WHERE employee_id = $1 AND start_time::date >= $2`,
      [employeeId, startDate]
    );

    res.json({
      success: true,
      data: {
        period,
        totalHours: Number(result.rows[0]?.total_hours || 0)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { clockIn, clockOut, getTodayAttendance, getAttendanceHistory, getAttendanceSummary, getTimeSummary };
