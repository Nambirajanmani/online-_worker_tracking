const TimerSession = require("../models/TimerSession");
const ActivityLog = require("../models/ActivityLog");
const Task = require("../models/Task");
const Employee = require("../models/Employee");

const ACTIVE_TIMER_STATUSES = ["running", "paused", "idle"];

const toSeconds = (value) => Number(value || 0);

const getSegmentSeconds = (session, now = new Date()) => {
  if (!session) return 0;
  const anchor = session.updated_at || session.start_time;
  const startedAt = anchor ? new Date(anchor) : null;
  if (!startedAt || Number.isNaN(startedAt.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
};

const calculateElapsedSeconds = (session, now = new Date()) => {
  if (!session) return 0;
  const activeDuration = toSeconds(session.active_duration);
  if (session.status === "running") {
    return activeDuration + getSegmentSeconds(session, now);
  }
  return activeDuration;
};

const formatActiveTimerResponse = (session) => {
  if (!session || !ACTIVE_TIMER_STATUSES.includes(session.status)) {
    return null;
  }

  return {
    timer_id: session.id,
    task_id: session.task_id,
    task_title: session.task_name,
    project_name: session.project_name || "No project assigned",
    start_time: session.start_time,
    status: session.status.toUpperCase(),
    elapsed_seconds: calculateElapsedSeconds(session),
  };
};

const formatTimeDisplay = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDurationDisplay = (seconds) => {
  const safeSeconds = Math.max(0, toSeconds(seconds));
  const h = Math.floor(safeSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((safeSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const formatCompletedTimerResponse = (session) => ({
  id: session.id,
  timer_id: session.id,
  task_id: session.task_id,
  employee_id: session.employee_id,
  task_title: session.task_name,
  start_time: formatTimeDisplay(session.start_time),
  end_time: formatTimeDisplay(session.end_time),
  total_duration: formatDurationDisplay(session.total_duration),
  status: "COMPLETED",
  raw: {
    start_time: session.start_time,
    end_time: session.end_time,
    total_duration: session.total_duration,
  },
});

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
      return res.status(400).json({
        success: false,
        message: "Another timer is already running",
        active_timer: formatActiveTimerResponse(activeSession),
      });
    }

    const task = await Task.findById(task_id);
    
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const session = await TimerSession.create({
      employee_id: employee.id,
      employee_name: `${employee.first_name} ${employee.last_name}`,
      task_id: task.id,
      task_name: task.task_title,
      project_name: task.project_name || null
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

    const active_duration = toSeconds(activeSession.active_duration) + getSegmentSeconds(activeSession);

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

    const pausedSeconds = getSegmentSeconds(activeSession);
    const isIdleSession = activeSession.status === "idle";
    const break_duration = toSeconds(activeSession.break_duration) + (isIdleSession ? 0 : pausedSeconds);
    const idle_duration = toSeconds(activeSession.idle_duration) + (isIdleSession ? pausedSeconds : 0);

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
    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    if (!activeSession) {
      return res.status(400).json({ success: false, message: "No active timer found" });
    }

    const segmentSeconds = activeSession.status === "running" ? getSegmentSeconds(activeSession) : 0;
    const pausedSeconds = activeSession.status === "paused" ? getSegmentSeconds(activeSession) : 0;
    const idleSeconds = activeSession.status === "idle" ? getSegmentSeconds(activeSession) : 0;
    const active_duration = toSeconds(activeSession.active_duration) + segmentSeconds;
    const break_duration = toSeconds(activeSession.break_duration) + pausedSeconds;
    const idle_duration = toSeconds(activeSession.idle_duration) + idleSeconds;
    const total_duration = active_duration + break_duration + idle_duration;

    const updated = await TimerSession.update(activeSession.id, { 
      status: 'completed',
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

    res.json({
      success: true,
      message: "Timer stopped successfully",
      data: formatCompletedTimerResponse(updated),
      session: updated,
    });
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
        const updatePayload = { status: status_change };

        if (status_change === "idle" && activeSession.status === "running") {
          updatePayload.active_duration =
            toSeconds(activeSession.active_duration) + getSegmentSeconds(activeSession);
        }

        const updated = await TimerSession.update(activeSession.id, updatePayload);
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

exports.getActiveTimer = async (req, res) => {
  try {
    const employee = await Employee.findByUserId(req.user.id);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    const activeSession = await TimerSession.findActiveByEmployeeId(employee.id);
    res.json({
      success: true,
      active_timer: formatActiveTimerResponse(activeSession),
    });
  } catch (error) {
    console.error("Get active timer error:", error);
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
