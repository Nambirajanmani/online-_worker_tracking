const moment = require("moment");
const { pool } = require("../config/database");

const LATE_THRESHOLD = "09:30:00";

const calculateHours = (clockIn, clockOut) => {
  const start = moment(clockIn, "HH:mm:ss");
  const end = moment(clockOut, "HH:mm:ss");
  return Number(moment.duration(end.diff(start)).asHours().toFixed(2));
};

const formatTime = (timeValue) => {
  if (!timeValue) return null;
  return moment(timeValue, ["HH:mm:ss", "HH:mm"]).format("HH:mm:ss");
};

const mapDisplayStatus = (row) => {
  if (!row?.clock_in_time) return "Absent";
  if (row.clock_out_time || row.status === "completed") return "Completed";
  if (row.status === "late") return "Late";
  if (row.status === "working" || row.status === "present") return "Working";
  return row.status || "Working";
};

const shapeAttendanceRow = (row) => ({
  id: row.id,
  employee_id: row.employee_id,
  employee_code: row.employee_code,
  first_name: row.first_name,
  last_name: row.last_name,
  employee_name: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
  date: row.date,
  attendance_date: row.date,
  clock_in_time: formatTime(row.clock_in_time),
  clock_out_time: formatTime(row.clock_out_time),
  total_hours: row.total_hours ? Number(row.total_hours) : null,
  status: row.status,
  display_status: mapDisplayStatus(row),
  created_at: row.created_at,
  updated_at: row.updated_at
});

const logAttendanceAction = async (client, { attendanceId, employeeId, action, row }) => {
  await client.query(
    `INSERT INTO attendance_logs (
      attendance_id, employee_id, action, clock_in_time, clock_out_time,
      total_hours, status, attendance_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      attendanceId,
      employeeId,
      action,
      row.clock_in_time,
      row.clock_out_time || null,
      row.total_hours || null,
      row.status,
      row.date
    ]
  );
};

const broadcastAttendanceUpdate = (req, payload) => {
  const io = req.app.get("io");
  if (!io) return;
  io.to("admin_room").emit("attendance:updated", payload);
};

const fetchAttendanceStats = async (date) => {
  const result = await pool.query(
    `SELECT
       COUNT(DISTINCT CASE WHEN a.clock_in_time IS NOT NULL THEN a.employee_id END)::int AS present,
       COUNT(DISTINCT CASE WHEN a.clock_in_time IS NOT NULL AND a.clock_out_time IS NULL THEN a.employee_id END)::int AS working,
       COUNT(DISTINCT CASE WHEN a.clock_out_time IS NOT NULL THEN a.employee_id END)::int AS clocked_out,
       COUNT(DISTINCT CASE WHEN a.status = 'late' OR a.clock_in_time > $2::time THEN a.employee_id END)::int AS late_arrivals
     FROM attendance a
     WHERE a.date = $1`,
    [date, LATE_THRESHOLD]
  );
  return result.rows[0];
};

const fetchAttendanceRecords = async ({ date, search, lateOnly, todayOnly }) => {
  const targetDate = todayOnly === "true" || todayOnly === true ? moment().format("YYYY-MM-DD") : date || moment().format("YYYY-MM-DD");
  let query = `
    SELECT
      a.*,
      e.first_name,
      e.last_name,
      e.employee_code
    FROM attendance a
    INNER JOIN employees e ON e.id = a.employee_id
    WHERE a.date = $1
  `;
  const params = [targetDate];
  let index = 2;

  if (search) {
    query += ` AND (
      e.first_name ILIKE $${index}
      OR e.last_name ILIKE $${index}
      OR e.employee_code ILIKE $${index}
      OR CONCAT(e.first_name, ' ', e.last_name) ILIKE $${index}
    )`;
    params.push(`%${search}%`);
    index += 1;
  }

  if (lateOnly === "true" || lateOnly === true) {
    query += ` AND (a.status = 'late' OR a.clock_in_time > $${index}::time)`;
    params.push(LATE_THRESHOLD);
    index += 1;
  }

  query += `
    ORDER BY
      COALESCE(a.updated_at, a.created_at) DESC,
      a.clock_in_time DESC NULLS LAST
  `;

  const result = await pool.query(query, params);
  return { date: targetDate, records: result.rows.map(shapeAttendanceRow) };
};

const clockIn = async (req, res) => {
  const client = await pool.connect();
  try {
    const employeeId = req.user.role === "admin" ? req.body.employeeId : req.user.employee_id;
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");

    const existing = await client.query("SELECT * FROM attendance WHERE employee_id = $1 AND date = $2", [
      employeeId,
      today
    ]);
    const row = existing.rows[0];

    if (row?.clock_in_time && !row?.clock_out_time) {
      return res.status(400).json({ success: false, message: "Already clocked in. Please clock out first." });
    }
    if (row?.clock_out_time) {
      return res.status(400).json({ success: false, message: "Attendance already completed for today." });
    }

    const status = currentTime > LATE_THRESHOLD ? "late" : "working";

    const result = await client.query(
      `INSERT INTO attendance (employee_id, date, clock_in_time, status, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [employeeId, today, currentTime, status]
    );

    const attendance = result.rows[0];
    const employee = await client.query(
      "SELECT first_name, last_name, employee_code FROM employees WHERE id = $1",
      [employeeId]
    );
    const fullRow = { ...attendance, ...employee.rows[0] };

    await logAttendanceAction(client, {
      attendanceId: attendance.id,
      employeeId,
      action: "clock_in",
      row: attendance
    });

    const shaped = shapeAttendanceRow(fullRow);
    const stats = await fetchAttendanceStats(today);

    broadcastAttendanceUpdate(req, {
      type: "clock_in",
      record: shaped,
      stats,
      date: today
    });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

const clockOut = async (req, res) => {
  const client = await pool.connect();
  try {
    const employeeId = req.user.role === "admin" ? req.body.employeeId : req.user.employee_id;
    const today = moment().format("YYYY-MM-DD");
    const currentTime = moment().format("HH:mm:ss");

    const attendance = await client.query("SELECT * FROM attendance WHERE employee_id = $1 AND date = $2", [
      employeeId,
      today
    ]);

    if (!attendance.rows[0]?.clock_in_time) {
      return res.status(400).json({ success: false, message: "Not clocked in yet" });
    }
    if (attendance.rows[0]?.clock_out_time) {
      return res.status(400).json({ success: false, message: "Already clocked out" });
    }

    const totalHours = calculateHours(attendance.rows[0].clock_in_time, currentTime);
    const overtimeHours = Math.max(0, totalHours - 8);

    const result = await client.query(
      `UPDATE attendance
       SET clock_out_time = $1,
           total_hours = $2,
           overtime_hours = $3,
           status = 'completed',
           updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $4 AND date = $5
       RETURNING *`,
      [currentTime, totalHours, overtimeHours, employeeId, today]
    );

    const updated = result.rows[0];
    const employee = await client.query(
      "SELECT first_name, last_name, employee_code FROM employees WHERE id = $1",
      [employeeId]
    );
    const fullRow = { ...updated, ...employee.rows[0] };

    await logAttendanceAction(client, {
      attendanceId: updated.id,
      employeeId,
      action: "clock_out",
      row: updated
    });

    const shaped = shapeAttendanceRow(fullRow);
    const stats = await fetchAttendanceStats(today);

    broadcastAttendanceUpdate(req, {
      type: "clock_out",
      record: shaped,
      stats,
      date: today
    });

    res.json({ success: true, data: shaped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  } finally {
    client.release();
  }
};

const getTodayAttendance = async (req, res) => {
  try {
    const today = moment().format("YYYY-MM-DD");

    if (req.user.role === "admin" && !req.query.employeeId) {
      const stats = await fetchAttendanceStats(today);
      return res.json({
        success: true,
        data: {
          ...stats,
          count: stats.present
        }
      });
    }

    const employeeId = req.user.role === "admin" ? req.query.employeeId : req.user.employee_id;
    const result = await pool.query(
      `SELECT a.*, e.first_name, e.last_name, e.employee_code
       FROM attendance a
       LEFT JOIN employees e ON e.id = a.employee_id
       WHERE a.employee_id = $1 AND a.date = $2`,
      [employeeId, today]
    );
    const row = result.rows[0];
    return res.json({ success: true, data: row ? shapeAttendanceRow(row) : null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAdminAttendanceTracking = async (req, res) => {
  try {
    const { records, date } = await fetchAttendanceRecords({
      date: req.query.date,
      search: req.query.search,
      lateOnly: req.query.lateOnly,
      todayOnly: req.query.todayOnly
    });
    const stats = await fetchAttendanceStats(date);

    res.json({
      success: true,
      data: {
        date,
        records,
        stats: {
          present: stats.present,
          working: stats.working,
          clockedOut: stats.clocked_out,
          lateArrivals: stats.late_arrivals
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const exportAttendanceReport = async (req, res) => {
  try {
    const startDate = req.query.startDate || req.query.date || moment().format("YYYY-MM-DD");
    const endDate = req.query.endDate || startDate;

    const result = await pool.query(
      `SELECT
        a.date,
        e.employee_code,
        e.first_name,
        e.last_name,
        a.clock_in_time,
        a.clock_out_time,
        a.total_hours,
        a.status
       FROM attendance a
       INNER JOIN employees e ON e.id = a.employee_id
       WHERE a.date BETWEEN $1 AND $2
       ORDER BY a.date DESC, e.employee_code ASC`,
      [startDate, endDate]
    );

    const header = "Date,Employee ID,Employee Name,Clock In,Clock Out,Total Hours,Status\n";
    const rows = result.rows
      .map((row) => {
        const name = `${row.first_name || ""} ${row.last_name || ""}`.trim();
        const shaped = shapeAttendanceRow(row);
        return [
          moment(row.date).format("YYYY-MM-DD"),
          row.employee_code || "",
          `"${name}"`,
          formatTime(row.clock_in_time) || "",
          formatTime(row.clock_out_time) || "",
          row.total_hours || "",
          shaped.display_status
        ].join(",");
      })
      .join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="attendance-${startDate}-to-${endDate}.csv"`
    );
    res.send(header + rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const employeeId = req.user.role === "admin" ? req.params.employeeId || req.query.employeeId : req.user.employee_id;
    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_code
      FROM attendance a
      LEFT JOIN employees e ON e.id = a.employee_id
      WHERE 1=1
    `;
    const params = [];
    let index = 1;

    if (employeeId) {
      query += ` AND a.employee_id = $${index++}`;
      params.push(employeeId);
    }

    if (req.query.startDate && req.query.endDate) {
      query += ` AND a.date BETWEEN $${index++} AND $${index++}`;
      params.push(req.query.startDate, req.query.endDate);
    } else {
      query += " AND a.date >= CURRENT_DATE - INTERVAL '30 days'";
    }

    query += " ORDER BY a.date DESC";
    const result = await pool.query(query, params);
    const rows = result.rows.map(shapeAttendanceRow);

    const summary = {
      totalDays: rows.length,
      presentDays: rows.filter((row) => row.clock_in_time).length,
      absentDays: rows.filter((row) => !row.clock_in_time).length,
      lateDays: rows.filter((row) => row.status === "late").length,
      completedDays: rows.filter((row) => row.display_status === "Completed").length,
      totalHours: rows.reduce((sum, row) => sum + Number(row.total_hours || 0), 0)
    };

    res.json({ success: true, data: rows, summary });
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
         COUNT(CASE WHEN a.clock_in_time IS NOT NULL THEN 1 END)::int AS present_count,
         COUNT(CASE WHEN a.status = 'absent' OR a.clock_in_time IS NULL THEN 1 END)::int AS absent_count,
         COUNT(CASE WHEN a.status = 'late' THEN 1 END)::int AS late_count,
         COUNT(CASE WHEN a.status = 'completed' THEN 1 END)::int AS completed_count,
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

module.exports = {
  clockIn,
  clockOut,
  getTodayAttendance,
  getAdminAttendanceTracking,
  exportAttendanceReport,
  getAttendanceHistory,
  getAttendanceSummary,
  getTimeSummary
};
