const express = require("express");
const router = express.Router();
const { protect, employeeOnly, adminOnly } = require("../middleware/authMiddleware");
const timerController = require("../controllers/timerController");

router.post("/start", protect, employeeOnly, timerController.startTimer);
router.post("/pause", protect, employeeOnly, timerController.pauseTimer);
router.post("/resume", protect, employeeOnly, timerController.resumeTimer);
router.post("/stop", protect, employeeOnly, timerController.stopTimer);
router.post("/notes", protect, employeeOnly, timerController.addNotes);
router.post("/activity", protect, employeeOnly, timerController.logActivity);

router.get("/history/:employeeId", protect, timerController.getHistory);
router.get("/summary/:employeeId", protect, timerController.getSummary);

router.get("/live", protect, adminOnly, timerController.getLiveStatus);

module.exports = router;
