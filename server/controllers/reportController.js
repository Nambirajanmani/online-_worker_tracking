const { pool } = require("../config/database");
const Report = require("../models/Report");
const Employee = require("../models/Employee");
const fs = require("fs");
const path = require("path");

// Employee: Create a new report
const createReport = async (req, res) => {
  try {
    console.log("📨 Received report creation request");
    console.log("  Body:", req.body);
    console.log("  File:", req.file ? `${req.file.filename} (${req.file.size} bytes)` : "No file");

    const { title, description, reportType, priority } = req.body;
    const userId = req.user.id;
    const attachment = req.file ? req.file.filename : null;

    // Validate required fields
    if (!title || !description || !reportType || !priority) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Get employee details
    const employeeResult = await pool.query(
      `SELECT e.id, e.employee_code, e.first_name, e.last_name, e.department 
       FROM employees e 
       WHERE e.user_id = $1`,
      [userId]
    );

    if (!employeeResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employee = employeeResult.rows[0];
    const employeeId = employee.id;
    const employeeName = `${employee.first_name} ${employee.last_name}`;
    const department = employee.department;

    const reportData = {
      employeeId,
      employeeName,
      department,
      title,
      description,
      reportType,
      priority,
      attachment,
    };

    const newReport = await Report.create(reportData);

    res.status(201).json({
      success: true,
      message: "Report submitted successfully",
      data: newReport,
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Employee: Get my reports
const getMyReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get employee ID
    const employeeResult = await pool.query(
      `SELECT id FROM employees WHERE user_id = $1`,
      [userId]
    );

    if (!employeeResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const employeeId = employeeResult.rows[0].id;

    const reports = await Report.findByEmployeeId(employeeId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const totalCount = await Report.findByEmployeeIdCount(employeeId);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get my reports error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Get all reports with filters
const getAllReports = async (req, res) => {
  try {
    const { status, department, employeeId, search, page = 1, limit = 10 } =
      req.query;
    const offset = (page - 1) * limit;

    const filters = {
      status: status || null,
      department: department || null,
      employeeId: employeeId || null,
      search: search || null,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };

    const reports = await Report.findAll(filters);
    const totalCount = await Report.findAllCount(filters);

    res.json({
      success: true,
      data: reports,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Get single report details
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error("Get report by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Update report status and remarks
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    // Validate status
    const validStatuses = ["Pending", "In Review", "Resolved", "Rejected"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    const updatedReport = await Report.update(id, {
      status: status || report.status,
      adminRemarks: adminRemarks !== undefined ? adminRemarks : report.admin_remarks,
    });

    res.json({
      success: true,
      message: "Report updated successfully",
      data: updatedReport,
    });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Get report statistics
const getReportStatistics = async (req, res) => {
  try {
    const stats = await Report.getStatistics();

    res.json({
      success: true,
      data: {
        total: parseInt(stats.total) || 0,
        pending: parseInt(stats.pending) || 0,
        inReview: parseInt(stats.in_review) || 0,
        resolved: parseInt(stats.resolved) || 0,
        rejected: parseInt(stats.rejected) || 0,
      },
    });
  } catch (error) {
    console.error("Get report statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Download attachment
const downloadAttachment = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);

    if (!report || !report.attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const filePath = path.join(
      __dirname,
      "../uploads",
      report.attachment
    );

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.download(filePath, report.attachment);
  } catch (error) {
    console.error("Download attachment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Admin: Get overview report (existing function)
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

module.exports = {
  createReport,
  getMyReports,
  getAllReports,
  getReportById,
  updateReport,
  getReportStatistics,
  downloadAttachment,
  getOverviewReport,
};
