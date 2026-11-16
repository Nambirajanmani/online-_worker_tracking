import React, { useCallback, useEffect, useState } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { api, API_URL } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

const parseDurationSeconds = (val) => {
  if (typeof val === "number" && Number.isFinite(val)) return Math.max(0, val);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":").map(Number);
      if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
        return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
      }
      if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) {
        return Math.max(0, parts[0] * 60 + parts[1]);
      }
    }
    const num = Number(trimmed);
    if (!Number.isNaN(num) && Number.isFinite(num)) return Math.max(0, num);
  }
  return 0;
};

const formatDuration = (val) => {
  const seconds = parseDurationSeconds(val);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatTime = (value) => {
  if (!value) return "--";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.includes("AM") || trimmed.includes("PM")) return trimmed;
    if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) return trimmed;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return typeof value === "string" && value.trim() ? value : "--";
  }
  return parsed.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const LiveMonitoring = () => {
  const [activeSessions, setActiveSessions] = useState([]);
  const [stats, setStats] = useState({
    totalActive: 0,
    working: 0,
    idle: 0,
    paused: 0,
    todayTotalDuration: 0,
    todayActiveDuration: 0,
    todayIdleDuration: 0,
  });

  const fetchLiveStatus = useCallback(async () => {
    try {
      const res = await api.get("/timer/live");
      if (res.data.success) {
        const sessions = res.data.activeSessions || res.data.liveEmployees || [];
        setActiveSessions(sessions);

        if (res.data.stats) {
          setStats(res.data.stats);
        } else {
          let working = 0;
          let idle = 0;
          let paused = 0;
          let totalActive = 0;
          let todayTotalDuration = 0;
          let todayActiveDuration = 0;
          let todayIdleDuration = 0;

          sessions.forEach((s) => {
            const st = String(s.status || "").toLowerCase();
            if (st === "running") {
              working++;
              totalActive++;
            } else if (st === "idle") {
              idle++;
              totalActive++;
            } else if (st === "paused") {
              paused++;
              totalActive++;
            }
            todayTotalDuration += parseDurationSeconds(s.today_total_duration);
            todayActiveDuration += parseDurationSeconds(s.today_active_duration);
            todayIdleDuration += parseDurationSeconds(s.today_idle_duration);
          });

          setStats({
            totalActive,
            working,
            idle,
            paused,
            todayTotalDuration,
            todayActiveDuration,
            todayIdleDuration,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch live status", error);
    }
  }, []);

  useEffect(() => {
    fetchLiveStatus();

    const token = localStorage.getItem("token");
    const socket = connectSocket(token);

    if (socket) {
      socket.on("timer_update", () => {
        fetchLiveStatus();
      });

      socket.on("timer:status_update", () => {
        fetchLiveStatus();
      });
    }

    const interval = setInterval(() => {
      fetchLiveStatus();
    }, 5000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.off("timer_update");
        socket.off("timer:status_update");
      }
    };
  }, [fetchLiveStatus]);

  const getStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    switch (s) {
      case "running":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Working
          </span>
        );
      case "paused":
        return (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">
            Paused
          </span>
        );
      case "idle":
        return (
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold uppercase text-rose-800">
            Idle
          </span>
        );
      case "completed":
      case "stopped":
        return (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase text-sky-800">
            Completed
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-700">
            Offline
          </span>
        );
    }
  };

  const serverBaseUrl = API_URL.replace(/\/api\/?$/, "");

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-800">Live Monitoring</h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-emerald-600">
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500"></span>
            </span>
            Live Updates Active
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
          <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Active</p>
              <h3 className="text-xl sm:text-3xl font-bold text-gray-800">{stats.totalActive || 0}</h3>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-100 text-sm sm:text-xl font-bold text-blue-600">
              {stats.totalActive || 0}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Working</p>
              <h3 className="text-xl sm:text-3xl font-bold text-emerald-600">{stats.working || 0}</h3>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-100 text-sm sm:text-xl font-bold text-emerald-600">
              {stats.working || 0}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Idle Detect</p>
              <h3 className="text-xl sm:text-3xl font-bold text-rose-600">{stats.idle || 0}</h3>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-rose-100 text-sm sm:text-xl font-bold text-rose-600">
              {stats.idle || 0}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-6 shadow-sm">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">On Break</p>
              <h3 className="text-xl sm:text-3xl font-bold text-amber-600">{stats.paused || 0}</h3>
            </div>
            <div className="flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-amber-100 text-sm sm:text-xl font-bold text-amber-600">
              {stats.paused || 0}
            </div>
          </div>
        </div>

        {/* Today's Overview Cards (mirrors Employee Portal metrics) */}
        <div className="grid grid-cols-1 gap-3 sm:gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm text-center">
            <p className="mb-1 text-xs sm:text-sm font-medium text-gray-500">Today's Total Time</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{formatDuration(stats.todayTotalDuration)}</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm text-center">
            <p className="mb-1 text-xs sm:text-sm font-medium text-gray-500">Active Working Time</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatDuration(stats.todayActiveDuration)}</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm text-center">
            <p className="mb-1 text-xs sm:text-sm font-medium text-gray-500">Idle Time Detected</p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-600">{formatDuration(stats.todayIdleDuration)}</p>
          </div>
        </div>

        {/* Live Employee Status List */}
        <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-6 sm:py-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Live Employee Status</h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {activeSessions.length} {activeSessions.length === 1 ? "Employee" : "Employees"} Tracked Today
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {activeSessions.length === 0 ? (
              <div className="p-6 sm:p-8 text-center text-sm sm:text-base text-gray-500">
                No active timers or employee session data recorded for today yet.
              </div>
            ) : (
              activeSessions.map((session) => (
                <div
                  key={session.id || session.employee_id}
                  className="flex flex-col justify-between gap-4 p-4 sm:p-6 transition-colors hover:bg-gray-50 lg:flex-row lg:items-center"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <img
                      src={
                        session.profile_pic
                          ? `${serverBaseUrl}${session.profile_pic}`
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(session.employee_name)}`
                      }
                      alt={session.employee_name}
                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-full border border-gray-200 object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h4 className="font-bold text-sm sm:text-base text-gray-900">{session.employee_name}</h4>
                        {session.employee_code && (
                          <span className="font-mono text-xs text-gray-400">({session.employee_code})</span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">
                        Task: <span className="font-medium text-blue-600">{session.task_name || "No task active"}</span>
                        {session.department && <span className="ml-1 sm:ml-2 text-gray-400">| {session.department}</span>}
                      </p>
                      {session.notes && (
                        <p className="mt-0.5 max-w-xs sm:max-w-md truncate text-xs italic text-gray-400">&quot;{session.notes}&quot;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-6">
                    <div className="grid grid-cols-3 gap-2 w-full sm:w-auto text-xs">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-2 sm:px-3.5 py-1.5 sm:py-2 text-center">
                        <span className="block text-[11px] sm:text-xs text-gray-500">Total</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-blue-700">
                          {formatDuration(session.today_total_duration)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-2 sm:px-3.5 py-1.5 sm:py-2 text-center">
                        <span className="block text-[11px] sm:text-xs text-gray-500">Active</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-emerald-700">
                          {formatDuration(session.today_active_duration)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50 px-2 sm:px-3.5 py-1.5 sm:py-2 text-center">
                        <span className="block text-[11px] sm:text-xs text-gray-500">Idle</span>
                        <span className="font-mono text-xs sm:text-sm font-bold text-rose-700">
                          {formatDuration(session.today_idle_duration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1.5">
                      {getStatusBadge(session.status)}
                      <span className="rounded bg-gray-100 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[11px] sm:text-xs font-medium text-gray-600">
                        {session.status === "running"
                          ? `Started: ${formatTime(session.start_time)}`
                          : session.end_time
                            ? `Ended: ${formatTime(session.end_time)}`
                            : `Started: ${formatTime(session.start_time)}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default LiveMonitoring;
