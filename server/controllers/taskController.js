const { pool } = require("../config/database");
const Task = require("../models/Task");
const TaskUpdate = require("../models/TaskUpdate");
const Employee = require("../models/Employee");

// Admin: Get all tasks with optional filters
const getTasks = async (req, res) => {
  try {
    const { status, priority, employee_id, search } = req.query;
    const filters = {
      assigned_by: req.user.employee_id,
    };

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (employee_id) filters.employee_id = employee_id;
    if (search) filters.search = search;

    const tasks = await Task.findAll(filters);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Admin: Create and assign a task
const createTask = async (req, res) => {
  try {
    const {
      employee_id,
      employee_name,
      task_title,
      task_description,
      priority,
      start_date,
      due_date,
      attachment,
    } = req.body;

    // Validate required fields
    if (!employee_id || !task_title) {
      return res
        .status(400)
        .json({
          success: false,
          message: "employee_id and task_title are required",
        });
    }

    // Validate employee exists
    const employee = await Employee.findById(employee_id);
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    // Validate due_date >= start_date
    if (start_date && due_date && new Date(due_date) < new Date(start_date)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Due date must be greater than or equal to start date",
        });
    }

    const task = await Task.create({
      employee_id,
      employee_name: employee_name || `${employee.first_name} ${employee.last_name}`,
      task_title,
      task_description,
      priority: priority || "medium",
      start_date,
      due_date,
      attachment,
      assigned_by: req.user.employee_id,
    });

    // Create notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ((SELECT user_id FROM employees WHERE id = $1), $2, $3, 'task')`,
      [
        employee_id,
        "New Task Assigned",
        `You have been assigned a new task: ${task_title}`,
      ]
    );

    // Emit WebSocket event
    if (global.io) {
      global.io.to(`employee_${employee_id}`).emit("task:assigned", task);
      global.io.to("admin_room").emit("task:created", task);
    }

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get task by ID (with updates/comments)
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const updates = await TaskUpdate.findByTaskId(req.params.id);

    res.json({ success: true, data: { ...task, updates } });
  } catch (error) {
    console.error("Get task by ID error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Employee: Get my assigned tasks
const getMyTasks = async (req, res) => {
  try {
    // Fetch only active/in-progress tasks for employee's time tracker
    const tasks = await Task.findByEmployeeId(req.user.employee_id, true);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get my tasks error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Update task (by admin or assigned employee)
const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Only admin who assigned it or the assigned employee can update
    if (
      req.user.employee_id !== task.assigned_by &&
      req.user.employee_id !== task.employee_id
    ) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updateData = {};
    if (req.body.task_title) updateData.task_title = req.body.task_title;
    if (req.body.task_description)
      updateData.task_description = req.body.task_description;
    if (req.body.priority) updateData.priority = req.body.priority;
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.due_date) updateData.due_date = req.body.due_date;
    if (req.body.start_date) updateData.start_date = req.body.start_date;
    if (req.body.actual_hours)
      updateData.actual_hours = req.body.actual_hours;
    if (req.body.completed_at && req.body.status === "completed") {
      updateData.completed_at = req.body.completed_at || new Date();
    }

    const updatedTask = await Task.update(taskId, updateData);

    // Emit WebSocket event
    if (global.io) {
      global.io.to(`employee_${task.employee_id}`).emit("task:updated", updatedTask);
      global.io.to("admin_room").emit("task:updated", updatedTask);
    }

    res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findById(taskId);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Only admin who assigned it can delete
    if (req.user.employee_id !== task.assigned_by) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    await Task.delete(taskId);

    // Emit WebSocket event
    if (global.io) {
      global.io.to(`employee_${task.employee_id}`).emit("task:deleted", { id: taskId });
      global.io.to("admin_room").emit("task:deleted", { id: taskId });
    }

    res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add task update/comment
const addTaskUpdate = async (req, res) => {
  try {
    const { comment, file, status } = req.body;
    const taskId = req.params.id;

    const task = await Task.findById(taskId);
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Only assigned employee can add updates
    if (req.user.employee_id !== task.employee_id) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const taskUpdate = await TaskUpdate.create({
      task_id: taskId,
      employee_id: req.user.employee_id,
      comment,
      file,
      status,
    });

    // If status provided, update task status
    if (status) {
      const updateData = { status };
      if (status === "completed") {
        updateData.completed_at = new Date();
      }
      await Task.update(taskId, updateData);
    }

    // Emit WebSocket event
    if (global.io) {
      global.io.to(`task_${taskId}`).emit("taskUpdate:added", taskUpdate);
      global.io.to("admin_room").emit("taskUpdate:added", taskUpdate);
    }

    res.status(201).json({ success: true, data: taskUpdate });
  } catch (error) {
    console.error("Add task update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get task stats for admin dashboard
const getTaskStats = async (req, res) => {
  try {
    const stats = await Task.getTaskStats(req.user.employee_id);
    res.json({
      success: true,
      data: {
        total: stats.total || 0,
        pending: stats.pending || 0,
        in_progress: stats.in_progress || 0,
        completed: stats.completed || 0,
        on_hold: stats.on_hold || 0,
        overdue: stats.overdue || 0,
      },
    });
  } catch (error) {
    console.error("Get task stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get task stats for employee dashboard
const getMyTaskStats = async (req, res) => {
  try {
    const stats = await Task.getEmployeeTaskStats(req.user.employee_id);
    res.json({
      success: true,
      data: {
        total: stats.total || 0,
        pending: stats.pending || 0,
        in_progress: stats.in_progress || 0,
        completed: stats.completed || 0,
        overdue: stats.overdue || 0,
      },
    });
  } catch (error) {
    console.error("Get my task stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  getTasks,
  createTask,
  getTaskById,
  getMyTasks,
  updateTask,
  deleteTask,
  addTaskUpdate,
  getTaskStats,
  getMyTaskStats,
};
