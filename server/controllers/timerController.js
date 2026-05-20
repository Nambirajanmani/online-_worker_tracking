const TimerSession = require("../models/TimerSession");
const ActivityLog = require("../models/ActivityLog");
const Task = require("../models/Task");
const Employee = require("../models/Employee");

exports.startTimer = async (req, res) => {
  try {
    const { task_id } = req.body;
    const userId = req.user.id;
    
    const employee = await Employee.findByUserId(userId);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    if (!task_id) return res.status(400).json({ success: false, message: "Task selection is required" });

    // Check if there's already an active timer
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (activeSession) {
      return res.status(400).json({ success: false, message: "Another timer is already running" });
    }

    // Get task details
    // Note: Assuming Task.findById exists, adjust if necessary
    const { pool } = require("../config/database");
    const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [task_id]);
    const task = taskResult.rows[0];
    
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const session = await TimerSession.create({
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      task_id: task.id,
      task_name: task.task_title,
      project_name: null // Assuming no project specific linked to task in this example, or fetch it if exists
    });

    await ActivityLog.create({
      session_id: session.id,
      employee_id: employee.id,
      activity_type: "timer_started",
      description: `Started working on task: ${task.task_title}`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });
    
    // Broadcast live status
    if (global.io) {
      global.io.emit("timer_update", { type: "started", session });
    }

    res.status(201).json({ success: true, session });
  } catch (error) {
    console.error("Start timer error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.pauseTimer = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findByUserId(userId);
    
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (!activeSession || activeSession.status !== 'running') {
      return res.status(400).json({ success: false, message: "No running timer found" });
    }

    // calculate active duration to add
    const now = new Date();
    // In a real scenario we'd track precise intervals, for now we will just mark as paused.
    // Frontend is calculating exact seconds. We rely on frontend's active duration passed if provided,
    // or calculate from last update. Let's just update the status for simplicity and add active_duration later or accept from body.
    const active_duration = req.body.active_duration || activeSession.active_duration;

    const updated = await TimerSession.update(activeSession.id, { 
      status: 'paused', 
      active_duration 
    });

    await ActivityLog.create({
      session_id: activeSession.id,
      employee_id: employee.id,
      activity_type: "timer_paused",
      description: `Timer paused`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    if (global.io) {
      global.io.emit("timer_update", { type: "paused", session: updated });
    }

    res.json({ success: true, session: updated });
  } catch (error) {
    console.error("Pause timer error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resumeTimer = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findByUserId(userId);
    
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (!activeSession || activeSession.status !== 'paused') {
      return res.status(400).json({ success: false, message: "No paused timer found" });
    }

    const break_duration = req.body.break_duration || activeSession.break_duration;
    const idle_duration = req.body.idle_duration || activeSession.idle_duration;

    const updated = await TimerSession.update(activeSession.id, { 
      status: 'running',
      break_duration,
      idle_duration
    });

    await ActivityLog.create({
      session_id: activeSession.id,
      employee_id: employee.id,
      activity_type: "timer_resumed",
      description: `Timer resumed`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    if (global.io) {
      global.io.emit("timer_update", { type: "resumed", session: updated });
    }

    res.json({ success: true, session: updated });
  } catch (error) {
    console.error("Resume timer error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.stopTimer = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findByUserId(userId);
    const { total_duration, active_duration, idle_duration, break_duration } = req.body;
    
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (!activeSession) {
      return res.status(400).json({ success: false, message: "No active timer found" });
    }

    const updated = await TimerSession.update(activeSession.id, { 
      status: 'stopped',
      end_time: new Date(),
      total_duration,
      active_duration,
      idle_duration,
      break_duration
    });

    await ActivityLog.create({
      session_id: activeSession.id,
      employee_id: employee.id,
      activity_type: "timer_stopped",
      description: `Timer stopped`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    if (global.io) {
      global.io.emit("timer_update", { type: "stopped", session: updated });
    }

    res.json({ success: true, session: updated });
  } catch (error) {
    console.error("Stop timer error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.addNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findByUserId(userId);
    const { notes } = req.body;
    
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (!activeSession) {
      return res.status(400).json({ success: false, message: "No active timer found" });
    }

    const updated = await TimerSession.update(activeSession.id, { 
      notes: activeSession.notes ? `${activeSession.notes}\n${notes}` : notes
    });

    await ActivityLog.create({
      session_id: activeSession.id,
      employee_id: employee.id,
      activity_type: "note_added",
      description: `Note added: ${notes}`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"]
    });

    res.json({ success: true, session: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.logActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const employee = await Employee.findByUserId(userId);
    const { activity_type, description, status_change } = req.body;
    
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (activeSession) {
      await ActivityLog.create({
        session_id: activeSession.id,
        employee_id: employee.id,
        activity_type,
        description,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"]
      });
      
      if (status_change) {
        const updated = await TimerSession.update(activeSession.id, { status: status_change });
        if (global.io) {
           global.io.emit("timer_update", { type: "status_change", session: updated });
        }
      } else {
        if (global.io) {
           global.io.emit("activity_logged", { session_id: activeSession.id, activity_type, description });
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getHistory = async (req, res) => {
  try {
    // Only allow admin or the employee themselves to view history
    const userId = req.user.id;
    let employeeId = req.params.employeeId;
    
    if (req.user.role !== 'admin') {
      const employee = await Employee.findByUserId(userId);
      if (employee.id != employeeId) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
      }
    }

    const history = await TimerSession.getHistoryByEmployee(employeeId);
    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    let employeeId = req.params.employeeId;
    const dateStr = new Date().toISOString().split('T')[0];
    
    if (req.user.role !== 'admin') {
       const employee = await Employee.findByUserId(userId);
       employeeId = employee.id;
    }

    const summary = await TimerSession.getDailySummary(employeeId, dateStr);
    res.json({ success: true, summary });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getLiveStatus = async (req, res) => {
  try {
    const activeSessions = await TimerSession.findActiveSessions();
    res.json({ success: true, activeSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
