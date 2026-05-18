const { pool } = require("../config/database");

const getOverviewReport = async (req, res) => {
  try {
    const [employees, tasks, attendance] = await Promise.all([
      pool.query("SELECT COUNT(*)::int AS count FROM employees"),
      pool.query("SELECT COUNT(*)::int AS count FROM tasks"),
      pool.query("SELECT COUNT(*)::int AS count FROM attendance WHERE date = CURRENT_DATE")
    ]);

    res.json({
      success: true,
      data: {
        employees: employees.rows[0].count,
        tasks: tasks.rows[0].count,
        attendanceToday: attendance.rows[0].count
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getOverviewReport };
