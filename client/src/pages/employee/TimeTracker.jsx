import React, { useEffect, useState, useRef, useCallback } from "react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import { api } from "../../lib/api";
import io from "socket.io-client";
import toast from "react-hot-toast";

const TimeTracker = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [session, setSession] = useState(null);
  const [timerText, setTimerText] = useState("00:00:00");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);
  
  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const idleTimeoutRef = useRef(null);
  const IDLE_MINUTES = 5;

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    fetchTasks();
    checkActiveSession();

    // Setup WebSocket
    const token = localStorage.getItem("token");
    const socketUrl = process.env.REACT_APP_SOCKET_URL || process.env.REACT_APP_API_URL?.replace('/api', '') || "http://localhost:8000";
    socketRef.current = io(socketUrl, {
      auth: { token }
    });

    socketRef.current.on("timer_update", (data) => {
      // Could sync state if needed, but local state manages fine for the employee
    });

    setupIdleDetection();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (socketRef.current) socketRef.current.disconnect();
      cleanupIdleDetection();
    };
  }, []);

  useEffect(() => {
    if (session && session.status === 'running') {
      startLocalTimer(session.start_time, session.active_duration);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [session]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get("/employee/tasks", {
        headers: getAuthHeaders(),
      });
      setTasks(res.data.data || res.data.tasks || []);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setTasks([]);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSession = async () => {
    // Assuming backend endpoint exists for active session or history
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if(!user.id) return;
      
      const res = await api.get(`/timer/history/${user.id}`, {
        headers: getAuthHeaders(),
      });
      const history = res.data.history || [];
      const active = history.find(s => s.status !== 'stopped');
      if (active) {
        setSession(active);
        setSelectedTaskId(active.task_id);
      }
    } catch (error) {
      console.error("Failed to fetch active session", error);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const handleTaskSelect = (taskId) => {
    setSelectedTaskId(taskId);
    const selected = tasks.find(t => t.id == taskId);
    if (selected) {
      setSelectedTaskDetails({
        title: selected.task_title || selected.title,
        project: selected.project_name || 'N/A',
        status: selected.status || 'PENDING'
      });
    }
  };

  const startLocalTimer = (startTime, initialActiveDuration) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    // We calculate current duration based on start time and known active duration
    const start = new Date(startTime).getTime();
    
    timerRef.current = setInterval(() => {
      const now = new Date().getTime();
      const diffInSeconds = Math.floor((now - start) / 1000);
      setTimerText(formatTime(diffInSeconds)); // Simple display showing total elapsed. Real app might separate active/idle visually
    }, 1000);
  };

  const handleStart = async () => {
    if (!selectedTaskId) {
      toast.error("Please select a task to start the timer.");
      return;
    }
    try {
      const res = await api.post("/timer/start", 
        { task_id: selectedTaskId }, 
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        setSession(res.data.session);
        toast.success("Timer started successfully");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to start timer");
    }
  };

  const handlePause = async () => {
    try {
      const res = await api.post("/timer/pause", 
        {}, 
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        setSession(res.data.session);
        toast.success("Timer paused");
      }
    } catch (error) {
      toast.error("Failed to pause timer");
    }
  };

  const handleResume = async () => {
    try {
      const res = await api.post("/timer/resume", 
        {}, 
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        setSession(res.data.session);
        toast.success("Timer resumed");
      }
    } catch (error) {
      toast.error("Failed to resume timer");
    }
  };

  const handleStop = async () => {
    try {
      // In a real scenario, calculate the exact seconds passed
      const res = await api.post("/timer/stop", 
        { total_duration: 0, active_duration: 0, idle_duration: 0, break_duration: 0 }, // Should calculate locally
        { headers: getAuthHeaders() }
      );
      if (res.data.success) {
        setSession(null);
        setTimerText("00:00:00");
        setSelectedTaskId("");
        toast.success("Timer stopped and session saved");
      }
    } catch (error) {
      toast.error("Failed to stop timer");
    }
  };

  const handleAddNote = async () => {
    if (!notes.trim()) return;
    try {
      await api.post("/timer/notes", 
        { notes }, 
        { headers: getAuthHeaders() }
      );
      toast.success("Note added");
      setNotes("");
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  // Idle Detection Logic
  const handleUserActivity = () => {
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    
    // If we were previously idle, we might want to log 'resumed activity'
    // but for now just reset the timeout
    idleTimeoutRef.current = setTimeout(() => {
      if (session && session.status === 'running') {
        logIdleActivity();
      }
    }, IDLE_MINUTES * 60 * 1000);
  };

  const logIdleActivity = async () => {
    try {
      await api.post("/timer/activity", 
        { activity_type: "idle_detected", description: `User idle for ${IDLE_MINUTES} minutes`, status_change: 'idle' },
        { headers: getAuthHeaders() }
      );
      toast.error("You have been marked as idle due to inactivity");
      checkActiveSession(); // refresh session
    } catch (error) {
      console.error("Failed to log idle", error);
    }
  };

  const setupIdleDetection = () => {
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("click", handleUserActivity);
  };

  const cleanupIdleDetection = () => {
    window.removeEventListener("mousemove", handleUserActivity);
    window.removeEventListener("keydown", handleUserActivity);
    window.removeEventListener("click", handleUserActivity);
  };

  return (
    <EmployeeLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="rounded-[1.5rem] bg-white p-8 shadow-lg ring-1 ring-stone-200 text-center">
          <h1 className="text-3xl font-semibold text-stone-900 mb-8">Time Tracker</h1>
          
          <div className="mb-8">
            {loading ? (
              <div className="flex justify-center items-center py-6">
                <p className="text-gray-600 text-lg">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-6 px-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800 font-medium">No assigned tasks found</p>
                <p className="text-amber-700 text-sm mt-1">Contact your manager to get tasks assigned</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedTaskId}
                  onChange={(e) => handleTaskSelect(e.target.value)}
                  disabled={session != null}
                  className="w-full max-w-md px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-100"
                >
                  <option value="">-- Select a Task --</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.task_title || t.title}</option>
                  ))}
                </select>

                {selectedTaskDetails && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm">
                      <p className="font-semibold text-blue-900">Task: {selectedTaskDetails.title}</p>
                      <p className="text-blue-700">Project: {selectedTaskDetails.project}</p>
                      <p className="text-blue-600">Status: <span className="font-medium">{selectedTaskDetails.status}</span></p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="font-mono text-7xl font-bold text-gray-800 mb-10 tracking-widest drop-shadow-sm">
            {timerText}
          </div>

          <div className="flex justify-center gap-4">
            {!session && (
              <button 
                onClick={handleStart} 
                disabled={!selectedTaskId || loading}
                className="px-10 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-md transition-all hover:-translate-y-0.5"
              >
                Start Timer
              </button>
            )}
            
            {session && session.status === 'running' && (
              <button onClick={handlePause} className="px-10 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg shadow-md transition-all hover:-translate-y-0.5">
                Pause
              </button>
            )}

            {session && (session.status === 'paused' || session.status === 'idle') && (
              <button onClick={handleResume} className="px-10 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-lg shadow-md transition-all hover:-translate-y-0.5">
                Resume
              </button>
            )}

            {session && (
              <button onClick={handleStop} className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-md transition-all hover:-translate-y-0.5">
                Stop Timer
              </button>
            )}
          </div>
          
          {session && (
             <div className="mt-6 inline-block px-4 py-1 rounded-full text-sm font-semibold uppercase tracking-wide bg-blue-100 text-blue-800">
               Status: {session.status}
             </div>
          )}
        </div>

        {session && (
          <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-semibold mb-4">Add Work Notes</h2>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What are you working on right now?"
                className="flex-1 border px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleAddNote} className="px-6 py-3 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900 transition">
                Add Note
              </button>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default TimeTracker;
