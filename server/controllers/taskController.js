const { pool } = require("../config/database");
const Task = require("../models/Task");

const getTasks = async (req, res) => {
  try {
    const filters = {};
    if (req.query.status) filters.status = req.query.status;
    if (req.query.priority) filters.priority = req.query.priority;
    if (req.query.assigned_to) filters.assigned_to = req.query.assigned_to;
    else if (req.user.role === "employee") filters.assigned_to = req.user.employee_id;

    const tasks = await Task.findAll(filters);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const createTask = async (req, res) => {
  try {
    const task = await Task.create({
      title: req.body.title,
      description: req.body.description,
      assignedBy: req.user.employee_id,
      assignedTo: req.body.assigned_to,
      projectId: req.body.project_id,
      priority: req.body.priority || "medium",
      dueDate: req.body.due_date,
      estimatedHours: req.body.estimated_hours
    });

    if (req.body.assigned_to) {
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ((SELECT user_id FROM employees WHERE id = $1), $2, $3, 'task')`,
        [req.body.assigned_to, "New Task Assigned", `You have been assigned a new task: ${req.body.title}`]
      );
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const updated = await Task.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getTaskStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_tasks,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed_tasks,
        COUNT(CASE WHEN status = 'in-progress' THEN 1 END)::int AS in_progress_tasks,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending_tasks
      FROM tasks
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { getTasks, createTask, updateTaskStatus, getTaskStats };
