const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getTodayAttendance, getAttendanceHistory, getAttendanceSummary, clockIn, clockOut } = require("../controllers/attendanceController");

const router = express.Router();

router.get("/today", protect, getTodayAttendance);
router.get("/history", protect, getAttendanceHistory);
router.get("/summary", protect, getAttendanceSummary);
router.post("/clock-in", protect, clockIn);
router.put("/clock-out", protect, clockOut);

module.exports = router;
