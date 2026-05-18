const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getTasks, createTask, updateTaskStatus, getTaskStats } = require("../controllers/taskController");

const router = express.Router();

router.route("/").get(protect, getTasks).post(protect, createTask);
router.put("/:id/status", protect, updateTaskStatus);
router.get("/stats/overview", protect, getTaskStats);

module.exports = router;
