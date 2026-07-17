const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  toggleEmployeeStatus
} = require("../controllers/employeeController");
const {
  getAttendanceHistory,
  getAttendanceSummary,
  getTodayAttendance,
  getAdminAttendanceTracking,
  exportAttendanceReport
} = require("../controllers/attendanceController");
const {
  getLeaveRequests,
  getLeaveStats,
  updateLeaveStatus,
  adminUpdateLeaveRequest,
  deleteLeaveRequest
} = require("../controllers/leaveController");
const { getTasks, getTaskStats } = require("../controllers/taskController");
const { getProjects } = require("../controllers/projectController");

const router = express.Router();

router.route("/employees").get(protect, adminOnly, getEmployees).post(protect, adminOnly, createEmployee);
router.route("/employees/:id").get(protect, adminOnly, getEmployeeById).put(protect, adminOnly, updateEmployee).delete(protect, adminOnly, deleteEmployee);
router.patch("/employees/:id/status", protect, adminOnly, toggleEmployeeStatus);
router.get("/stats", protect, adminOnly, getEmployeeStats);
router.get("/attendance", protect, adminOnly, getAttendanceHistory);
router.get("/attendance/tracking", protect, adminOnly, getAdminAttendanceTracking);
router.get("/attendance/export", protect, adminOnly, exportAttendanceReport);
router.get("/attendance/summary", protect, adminOnly, getAttendanceSummary);
router.get("/attendance/today", protect, adminOnly, getTodayAttendance);
router.get("/leaves", protect, adminOnly, getLeaveRequests);
router.get("/leaves/stats", protect, adminOnly, getLeaveStats);
router.put("/leaves/:id", protect, adminOnly, updateLeaveStatus);
router.put("/leaves/:id/edit", protect, adminOnly, adminUpdateLeaveRequest);
router.delete("/leaves/:id", protect, adminOnly, deleteLeaveRequest);
router.get("/tasks", protect, adminOnly, getTasks);
router.get("/tasks/stats", protect, adminOnly, getTaskStats);
router.get("/projects", protect, adminOnly, getProjects);

module.exports = router;