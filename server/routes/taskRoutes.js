const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getTasks,
  createTask,
  getTaskById,
  getMyTasks,
  updateTask,
  deleteTask,
  addTaskUpdate,
  getTaskStats,
  getMyTaskStats,
} = require("../controllers/taskController");

const router = express.Router();

// Specific routes first (to avoid conflicts)
router.get("/stats/admin", protect, getTaskStats);
router.get("/stats/my", protect, getMyTaskStats);
router.get("/my/tasks", protect, getMyTasks);

// General routes last
router.route("/").get(protect, getTasks).post(protect, createTask);
router.route("/:id").get(protect, getTaskById).put(protect, updateTask).delete(protect, deleteTask);

// Task updates/comments
router.post("/:id/updates", protect, addTaskUpdate);

module.exports = router;
