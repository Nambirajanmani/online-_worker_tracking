const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getLeaveRequests, getLeaveBalances, createLeaveRequest, updateLeaveStatus, cancelLeaveRequest } = require("../controllers/leaveController");

const router = express.Router();

router.route("/").get(protect, getLeaveRequests).post(protect, createLeaveRequest);
router.get("/balance", protect, getLeaveBalances);
router.put("/:id/status", protect, adminOnly, updateLeaveStatus);
router.put("/:id/cancel", protect, cancelLeaveRequest);

module.exports = router;
