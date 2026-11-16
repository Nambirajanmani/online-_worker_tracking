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
      <div className="space-y-6 p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h1 className="text-3xl font-semibold text-gray-800">Live Monitoring</h1>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
            Live Updates Active
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Active Timers</p>
              <h3 className="text-3xl font-bold text-gray-800">{stats.totalActive || 0}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
              {stats.totalActive || 0}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-500">Currently Working</p>
              <h3 className="text-3xl font-bold text-emerald-600">{stats.working || 0}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-600">
              {stats.working || 0}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-500">Idle Detect</p>
              <h3 className="text-3xl font-bold text-rose-600">{stats.idle || 0}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-xl font-bold text-rose-600">
              {stats.idle || 0}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-500">On Break / Paused</p>
              <h3 className="text-3xl font-bold text-amber-600">{stats.paused || 0}</h3>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-amber-600">
              {stats.paused || 0}
            </div>
          </div>
        </div>

        {/* Today's Overview Cards (mirrors Employee Portal metrics) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="mb-1 text-sm font-medium text-gray-500">Today's Total Time</p>
            <p className="text-3xl font-bold text-blue-600">{formatDuration(stats.todayTotalDuration)}</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="mb-1 text-sm font-medium text-gray-500">Active Working Time</p>
            <p className="text-3xl font-bold text-emerald-600">{formatDuration(stats.todayActiveDuration)}</p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <p className="mb-1 text-sm font-medium text-gray-500">Idle Time Detected</p>
            <p className="text-3xl font-bold text-rose-600">{formatDuration(stats.todayIdleDuration)}</p>
          </div>
        </div>

        {/* Live Employee Status List */}
        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-800">Live Employee Status</h2>
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              {activeSessions.length} {activeSessions.length === 1 ? "Employee" : "Employees"} Tracked Today
            </span>
          </div>

          <div className="divide-y divide-gray-100">
            {activeSessions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No active timers or employee session data recorded for today yet.
              </div>
            ) : (
              activeSessions.map((session) => (
                <div
                  key={session.id || session.employee_id}
                  className="flex flex-col justify-between gap-4 p-6 transition-colors hover:bg-gray-50 lg:flex-row lg:items-center"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={
                        session.profile_pic
                          ? `${serverBaseUrl}${session.profile_pic}`
                          : `https://ui-avatars.com/api/?name=${encodeURIComponent(session.employee_name)}`
                      }
                      alt={session.employee_name}
                      className="h-12 w-12 rounded-full border border-gray-200 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900">{session.employee_name}</h4>
                        {session.employee_code && (
                          <span className="font-mono text-xs text-gray-400">({session.employee_code})</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Task: <span className="font-medium text-blue-600">{session.task_name || "No task active"}</span>
                        {session.department && <span className="ml-2 text-gray-400">| {session.department}</span>}
                      </p>
                      {session.notes && (
                        <p className="mt-1 w-64 truncate text-xs italic text-gray-400">&quot;{session.notes}&quot;</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2 text-center">
                        <span className="block text-gray-500">Today&apos;s Total</span>
                        <span className="font-mono text-sm font-bold text-blue-700">
                          {formatDuration(session.today_total_duration)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-center">
                        <span className="block text-gray-500">Active Time</span>
                        <span className="font-mono text-sm font-bold text-emerald-700">
                          {formatDuration(session.today_active_duration)}
                        </span>
                      </div>
                      <div className="rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-center">
                        <span className="block text-gray-500">Idle Time</span>
                        <span className="font-mono text-sm font-bold text-rose-700">
                          {formatDuration(session.today_idle_duration)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-1.5 lg:items-end">
                      {getStatusBadge(session.status)}
                      <span className="rounded bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-600">
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
