const express = require("express");
const { protect, employeeOnly } = require("../middleware/authMiddleware");
const { getProfile, updateProfile } = require("../controllers/employeeController");
const { getTodayAttendance, getAttendanceHistory, clockIn, clockOut, getTimeSummary } = require("../controllers/attendanceController");
const {
  getLeaveRequests,
  getLeaveBalances,
  createLeaveRequest,
  updateEmployeeLeaveRequest,
  cancelLeaveRequest
} = require("../controllers/leaveController");
const { getMyTasks, updateTask, addTaskUpdate } = require("../controllers/taskController");

const router = express.Router();

router.get("/profile", protect, employeeOnly, getProfile);
router.put("/profile", protect, employeeOnly, updateProfile);
router.get("/attendance/today", protect, employeeOnly, getTodayAttendance);
router.get("/attendance", protect, employeeOnly, getAttendanceHistory);
router.post("/attendance/clock-in", protect, employeeOnly, clockIn);
router.put("/attendance/clock-out", protect, employeeOnly, clockOut);
router.get("/time-summary", protect, employeeOnly, getTimeSummary);
router.get("/tasks", protect, employeeOnly, getMyTasks);
router.put("/tasks/:id", protect, employeeOnly, updateTask);
router.post("/tasks/:id/updates", protect, employeeOnly, addTaskUpdate);
router.get("/leaves", protect, employeeOnly, getLeaveRequests);
router.get("/leaves/balance", protect, employeeOnly, getLeaveBalances);
router.post("/leaves", protect, employeeOnly, createLeaveRequest);
router.put("/leaves/:id", protect, employeeOnly, updateEmployeeLeaveRequest);
router.put("/leaves/:id/cancel", protect, employeeOnly, cancelLeaveRequest);

module.exports = router;
