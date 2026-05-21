import React, { useCallback, useEffect, useRef, useState } from "react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import { api } from "../../lib/api";
import io from "socket.io-client";
import toast from "react-hot-toast";

const IDLE_MINUTES = 5;

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const h = Math.floor(safeSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((safeSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(safeSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

const formatTime = (value) => {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const isToday = (value) => {
  if (!value) return false;
  const parsed = new Date(value);
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
};

const buildCompletedSummary = (session) => ({
  id: session.id || session.timer_id,
  task_title: session.task_title || session.task_name || "Untitled task",
  start_time:
    typeof session.start_time === "string" && session.start_time.includes(":") && !session.start_time.includes("T")
      ? session.start_time
      : formatTime(session.start_time),
  end_time:
    typeof session.end_time === "string" && session.end_time.includes(":") && !session.end_time.includes("T")
      ? session.end_time
      : formatTime(session.end_time),
  total_duration:
    typeof session.total_duration === "string" && session.total_duration.includes(":")
      ? session.total_duration
      : formatDuration(session.total_duration),
  status: session.status || "COMPLETED",
});

const normalizeCompletedLog = (completedTimer) => ({
  id: completedTimer.id || completedTimer.timer_id,
  task_name: completedTimer.task_title,
  task_title: completedTimer.task_title,
  start_time: completedTimer.raw?.start_time || completedTimer.start_time,
  end_time: completedTimer.raw?.end_time || completedTimer.end_time,
  total_duration:
    typeof completedTimer.raw?.total_duration === "number"
      ? completedTimer.raw.total_duration
      : completedTimer.total_duration,
  status: String(completedTimer.status || "COMPLETED").toLowerCase(),
});

const TimeTracker = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [activeTimer, setActiveTimer] = useState(null);
  const [displayElapsedSeconds, setDisplayElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [completedSummary, setCompletedSummary] = useState(null);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const activeTimerRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const getEmployeeId = useCallback(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.employee_id || user.id || null;
  }, []);

  const syncSelectedTaskDetails = useCallback((taskId, taskList) => {
    const selected = taskList.find((task) => String(task.id) === String(taskId));
    if (!selected) {
      setSelectedTaskDetails(null);
      return;
    }

    setSelectedTaskDetails({
      title: selected.task_title || selected.title || "Untitled task",
      project: selected.project_name || "No project assigned",
      status: selected.status || "PENDING",
    });
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/employee/tasks", {
        headers: getAuthHeaders(),
      });
      const taskList = res.data.data || res.data.tasks || [];
      setTasks(taskList);
      if (selectedTaskId) {
        syncSelectedTaskDetails(selectedTaskId, taskList);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setTasks([]);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedTaskId, syncSelectedTaskDetails]);

  const fetchTodayLogs = useCallback(async () => {
    const employeeId = getEmployeeId();
    if (!employeeId) return;

    try {
      const res = await api.get(`/timer/history/${employeeId}`, {
        headers: getAuthHeaders(),
      });
      const history = res.data.history || [];
      const todaysSessions = history
        .filter((session) => isToday(session.start_time))
        .sort((a, b) => new Date(b.start_time) - new Date(a.start_time));

      setTodayLogs(todaysSessions);

      const latestCompleted = todaysSessions.find((session) =>
        ["completed", "stopped"].includes(String(session.status || "").toLowerCase())
      );

      if (latestCompleted) {
        setCompletedSummary(buildCompletedSummary(latestCompleted));
      } else {
        setCompletedSummary(null);
      }
    } catch (error) {
      console.error("Failed to fetch time logs", error);
    }
  }, [getAuthHeaders, getEmployeeId]);

  const fetchActiveTimer = useCallback(async () => {
    try {
      const res = await api.get("/employee/active-timer", {
        headers: getAuthHeaders(),
      });
      const timer = res.data.active_timer || null;
      activeTimerRef.current = timer;
      setActiveTimer(timer);
      setDisplayElapsedSeconds(timer?.elapsed_seconds || 0);

      if (timer?.task_id) {
        setSelectedTaskId(String(timer.task_id));
      }
    } catch (error) {
      console.error("Failed to fetch active timer", error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTasks();
    fetchActiveTimer();
    fetchTodayLogs();

    const token = localStorage.getItem("token");
    const socketUrl =
      process.env.REACT_APP_SOCKET_URL ||
      process.env.REACT_APP_API_URL?.replace("/api", "") ||
      "http://localhost:8000";

    socketRef.current = io(socketUrl, {
      auth: { token },
    });

    socketRef.current.on("timer_update", () => {
      fetchActiveTimer();
      fetchTodayLogs();
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [fetchActiveTimer, fetchTasks, fetchTodayLogs]);

  useEffect(() => {
    activeTimerRef.current = activeTimer;
    if (activeTimer?.task_id) {
      setSelectedTaskId(String(activeTimer.task_id));
    }
  }, [activeTimer]);

  useEffect(() => {
    if (selectedTaskId) {
      syncSelectedTaskDetails(selectedTaskId, tasks);
    } else {
      setSelectedTaskDetails(null);
    }
  }, [selectedTaskId, syncSelectedTaskDetails, tasks]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!activeTimer) {
      setDisplayElapsedSeconds(0);
      return;
    }

    setDisplayElapsedSeconds(activeTimer.elapsed_seconds || 0);

    if (activeTimer.status === "RUNNING") {
      timerRef.current = setInterval(() => {
        setDisplayElapsedSeconds((current) => current + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTimer]);

  const logIdleActivity = useCallback(async () => {
    const timer = activeTimerRef.current;
    if (!timer || timer.status !== "RUNNING") {
      return;
    }

    try {
      await api.post(
        "/timer/activity",
        {
          activity_type: "idle_detected",
          description: `User idle for ${IDLE_MINUTES} minutes`,
          status_change: "idle",
        },
        { headers: getAuthHeaders() }
      );
      toast.error("You have been marked as idle due to inactivity");
      fetchActiveTimer();
    } catch (error) {
      console.error("Failed to log idle", error);
    }
  }, [fetchActiveTimer, getAuthHeaders]);

  const handleUserActivity = useCallback(() => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);

    const timer = activeTimerRef.current;
    if (!timer || timer.status !== "RUNNING") {
      return;
    }

    idleTimeoutRef.current = setTimeout(() => {
      logIdleActivity();
    }, IDLE_MINUTES * 60 * 1000);
  }, [logIdleActivity]);

  useEffect(() => {
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
    handleUserActivity();

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
    };
  }, [handleUserActivity]);

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId);
    syncSelectedTaskDetails(taskId, tasks);
  };

  const handleStart = async () => {
    if (!selectedTaskId) {
      toast.error("Please select a task to start the timer.");
      return;
    }

    if (activeTimer) {
      toast.error("You already have an active timer. Please stop or pause it first.");
      return;
    }

    try {
      const res = await api.post(
        "/timer/start",
        { task_id: selectedTaskId },
        { headers: getAuthHeaders() }
      );

      if (res.data.success) {
        toast.success("Timer started successfully");
        await fetchActiveTimer();
        await fetchTodayLogs();
      }
    } catch (error) {
      const timerFromError = error.response?.data?.active_timer || null;
      if (timerFromError) {
        setActiveTimer(timerFromError);
        setDisplayElapsedSeconds(timerFromError.elapsed_seconds || 0);
      }
      toast.error(error.response?.data?.message || "Failed to start timer");
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.post("/timer/pause", {}, { headers: getAuthHeaders() });
      if (res.data.success) {
        toast.success("Timer paused");
        await fetchActiveTimer();
        await fetchTodayLogs();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to pause timer");
    }
  };

  const handleResume = async () => {
    try {
      const res = await api.post("/timer/resume", {}, { headers: getAuthHeaders() });
      if (res.data.success) {
        toast.success("Timer resumed");
        await fetchActiveTimer();
        await fetchTodayLogs();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resume timer");
    }
  };

  const handleStop = async () => {
    if (!window.confirm("Are you sure you want to stop this timer?")) {
      return;
    }

    try {
      const res = await api.post("/employee/stop-timer", {}, { headers: getAuthHeaders() });
      if (res.data.success) {
        const completedTimer = res.data.data || null;
        const normalizedCompletedLog = completedTimer ? normalizeCompletedLog(completedTimer) : null;

        setCompletedSummary(completedTimer ? buildCompletedSummary(completedTimer) : null);
        if (normalizedCompletedLog) {
          setTodayLogs((prev) => {
            const nextLogs = [
              normalizedCompletedLog,
              ...prev.filter((log) => String(log.id) !== String(normalizedCompletedLog.id)),
            ];

            return nextLogs.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
          });
        }
        setActiveTimer(null);
        activeTimerRef.current = null;
        setDisplayElapsedSeconds(0);
        setSelectedTaskId("");
        setSelectedTaskDetails(null);
        setNotes("");
        toast.success(res.data.message || "Timer stopped successfully");
        await fetchActiveTimer();
        await fetchTodayLogs();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to stop timer");
    }
  };

  const handleAddNote = async () => {
    if (!notes.trim()) return;
    try {
      await api.post("/timer/notes", { notes }, { headers: getAuthHeaders() });
      toast.success("Note added");
      setNotes("");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const hasActiveTimer = Boolean(activeTimer);
  const runningStatusTone =
    activeTimer?.status === "RUNNING"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : "bg-amber-100 text-amber-800 ring-amber-200";
  const totalTrackedToday = formatDuration(
    todayLogs
      .filter((session) => ["completed", "stopped"].includes(String(session.status || "").toLowerCase()))
      .reduce((sum, session) => sum + Number(session.total_duration || 0), 0)
  );

  return (
    <EmployeeLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <div className="rounded-[1.5rem] bg-white p-8 shadow-lg ring-1 ring-stone-200">
          <h1 className="mb-8 text-center text-3xl font-semibold text-stone-900">Time Tracker</h1>

          {hasActiveTimer && (
            <div className="mb-8 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Running Timer</p>
                  <h2 className="mt-1 text-2xl font-bold text-stone-900">Current Running Task</h2>
                </div>
                <span className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${runningStatusTone}`}>
                  Status: {activeTimer.status}
                </span>
              </div>

              <div className="grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-emerald-100 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-stone-500">Task Name</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{activeTimer.task_title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Project</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{activeTimer.project_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Started At</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{formatTime(activeTimer.start_time)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Elapsed Time</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-emerald-700">
                    {formatDuration(displayElapsedSeconds)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                <p className="font-semibold">
                  You already have an active timer running for: "{activeTimer.task_title}"
                </p>
                <p className="mt-1 text-sm">Please stop or pause it before starting another task.</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {activeTimer.status === "RUNNING" && (
                  <button
                    onClick={handlePause}
                    className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-orange-600"
                  >
                    Pause Timer
                  </button>
                )}

                {(activeTimer.status === "PAUSED" || activeTimer.status === "IDLE") && (
                  <button
                    onClick={handleResume}
                    className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-green-700"
                  >
                    Resume Timer
                  </button>
                )}

                <button
                  onClick={handleStop}
                  className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-red-700"
                >
                  Stop Timer
                </button>
              </div>
            </div>
          )}

          {!hasActiveTimer && completedSummary && (
            <div className="mb-8 rounded-[1.25rem] border border-sky-200 bg-sky-50 p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Task Completed</p>
              <h2 className="mt-1 text-2xl font-bold text-stone-900">Completed Timer Summary</h2>

              <div className="mt-4 grid gap-4 rounded-2xl bg-white p-5 ring-1 ring-sky-100 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-stone-500">Task</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{completedSummary.task_title}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Status</p>
                  <p className="mt-1 text-lg font-semibold text-sky-700">{completedSummary.status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">Start Time</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{completedSummary.start_time}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-500">End Time</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{completedSummary.end_time}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-stone-500">Total Time</p>
                  <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-sky-700">
                    {completedSummary.total_duration}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <p className="text-lg text-gray-600">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6">
                <p className="font-medium text-amber-800">No assigned tasks found</p>
                <p className="mt-1 text-sm text-amber-700">Contact your manager to get tasks assigned</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedTaskId}
                  onChange={(e) => handleTaskSelect(e.target.value)}
                  disabled={hasActiveTimer}
                  className="w-full max-w-md rounded-xl border border-gray-300 px-4 py-3 shadow-sm focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">-- Select a Task --</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.task_title || task.title}
                    </option>
                  ))}
                </select>

                {selectedTaskDetails && (
                  <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">Task: {selectedTaskDetails.title}</p>
                      <p className="text-blue-700">Project: {selectedTaskDetails.project}</p>
                      <p className="text-blue-600">
                        Status: <span className="font-medium uppercase">{selectedTaskDetails.status}</span>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mb-10 text-center font-mono text-7xl font-bold tracking-widest text-gray-800 drop-shadow-sm">
            {formatDuration(displayElapsedSeconds)}
          </div>

          <div className="flex justify-center gap-4">
            {!hasActiveTimer && (
              <button
                onClick={handleStart}
                disabled={!selectedTaskId || loading}
                className="rounded-xl bg-blue-600 px-10 py-4 text-lg font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                Start Timer
              </button>
            )}
          </div>
        </div>

        {hasActiveTimer && (
          <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
            <h2 className="mb-4 text-xl font-semibold">Add Work Notes</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you working on right now?"
                className="flex-1 rounded-lg border px-4 py-3 focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddNote}
                className="rounded-lg bg-gray-800 px-6 py-3 font-medium text-white transition hover:bg-gray-900"
              >
                Add Note
              </button>
            </div>
          </div>
        )}

        <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Today</p>
              <h2 className="text-2xl font-bold text-stone-900">Today&apos;s Time Logs</h2>
            </div>
            <div className="rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700">
              Total tracked: {totalTrackedToday}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200 text-xs uppercase tracking-[0.18em] text-stone-500">
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Start Time</th>
                  <th className="px-4 py-3">End Time</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-stone-500">
                      No time logs recorded for today yet.
                    </td>
                  </tr>
                ) : (
                  todayLogs.map((session) => {
                    const normalizedStatus = String(session.status || "").toLowerCase();
                    const statusLabel =
                      normalizedStatus === "stopped" || normalizedStatus === "completed"
                        ? "COMPLETED"
                        : normalizedStatus.toUpperCase();
                    const statusTone =
                      normalizedStatus === "completed" || normalizedStatus === "stopped"
                        ? "bg-sky-100 text-sky-800"
                        : normalizedStatus === "running"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800";

                    return (
                      <tr key={session.id} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-4 font-medium text-stone-900">
                          {session.task_title || session.task_name}
                        </td>
                        <td className="px-4 py-4 text-stone-600">{formatTime(session.start_time)}</td>
                        <td className="px-4 py-4 text-stone-600">{formatTime(session.end_time)}</td>
                        <td className="px-4 py-4 font-mono font-semibold text-stone-900">
                          {formatDuration(session.total_duration || session.active_duration)}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default TimeTracker;
