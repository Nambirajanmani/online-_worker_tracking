import React, { useCallback, useEffect, useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaDownload,
  FaSearch,
  FaSync,
  FaUserCheck,
  FaUserClock,
  FaUserMinus,
  FaUserTimes
} from "react-icons/fa";
import { useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../lib/api";
import { connectSocket, disconnectSocket } from "../../lib/socket";

const today = () => new Date().toISOString().split("T")[0];

const statusStyles = {
  Working: "bg-sky-100 text-sky-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Late: "bg-amber-100 text-amber-800",
  Present: "bg-indigo-100 text-indigo-700",
  Absent: "bg-slate-100 text-slate-600"
};

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="rounded-[1.25rem] bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
        <Icon className="text-xl" />
      </div>
    </div>
  </div>
);

const Tracking = () => {
  const { token } = useSelector((state) => state.auth);
  const [selectedDate, setSelectedDate] = useState(today());
  const [searchTerm, setSearchTerm] = useState("");
  const [lateOnly, setLateOnly] = useState(false);
  const [todayOnly, setTodayOnly] = useState(true);
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({ present: 0, working: 0, clockedOut: 0, lateArrivals: 0 });
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchTracking = useCallback(async () => {
    try {
      const { data } = await api.get("/admin/attendance/tracking", {
        params: {
          date: selectedDate,
          search: searchTerm || undefined,
          lateOnly: lateOnly || undefined,
          todayOnly: todayOnly || undefined
        }
      });
      const payload = data.data || data;
      setRecords(payload.records || []);
      setStats(payload.stats || { present: 0, working: 0, clockedOut: 0, lateArrivals: 0 });
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load attendance tracking", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, searchTerm, lateOnly, todayOnly]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchTracking, 300);
    const pollTimer = setInterval(fetchTracking, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(pollTimer);
    };
  }, [fetchTracking]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    const handleAttendanceUpdate = (payload) => {
      const { record, stats: liveStats, type } = payload;
      if (liveStats) {
        setStats({
          present: liveStats.present ?? 0,
          working: liveStats.working ?? 0,
          clockedOut: liveStats.clocked_out ?? liveStats.clockedOut ?? 0,
          lateArrivals: liveStats.late_arrivals ?? liveStats.lateArrivals ?? 0
        });
      }
      if (record) {
        const recordDate = String(record.date || payload.date || "").slice(0, 10);
        if (recordDate && recordDate !== selectedDate) {
          return;
        }

        setRecords((current) => {
          const index = current.findIndex((item) => item.id === record.id);
          if (index === -1) return [record, ...current];
          const next = [...current];
          next[index] = record;
          return next;
        });
        setActivityFeed((current) =>
          [{
            id: `${record.id}-${Date.now()}`,
            type,
            employee_name: record.employee_name,
            employee_code: record.employee_code,
            time: type === "clock_in" ? record.clock_in_time : record.clock_out_time,
            at: new Date().toISOString()
          }, ...current].slice(0, 12)
        );
      }
      setLastUpdated(new Date());
    };
    socket.on("attendance:updated", handleAttendanceUpdate);
    return () => {
      socket.off("attendance:updated", handleAttendanceUpdate);
      disconnectSocket();
    };
  }, [token, selectedDate]);

  const handleExport = async () => {
    try {
      const response = await api.get("/admin/attendance/export", {
        params: { date: selectedDate, startDate: selectedDate, endDate: selectedDate },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `attendance-${selectedDate}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-slate-900">Attendance Tracking</h1>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Live
              </span>
            </div>
            <p className="mt-1 text-slate-600">Real-time employee clock-in and clock-out activity.</p>
            {lastUpdated && <p className="mt-1 text-xs text-slate-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-secondary" onClick={fetchTracking}><FaSync className="mr-2" /> Refresh</button>
            <button type="button" className="btn-primary" onClick={handleExport}><FaDownload className="mr-2" /> Export Report</button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Present Today" value={stats.present} icon={FaUserCheck} />
          <StatCard label="Currently Working" value={stats.working} icon={FaUserClock} />
          <StatCard label="Clocked Out" value={stats.clockedOut} icon={FaUserMinus} />
          <StatCard label="Late Arrivals" value={stats.lateArrivals} icon={FaUserTimes} />
        </div>

        <div className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Search employee</label>
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Name or employee ID" className="input-field pl-11" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setTodayOnly(e.target.value === today()); }} className="input-field pl-11" />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" checked={todayOnly} onChange={(e) => { setTodayOnly(e.target.checked); if (e.target.checked) setSelectedDate(today()); }} />
                Today only
              </label>
              <label className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <input type="checkbox" checked={lateOnly} onChange={(e) => setLateOnly(e.target.checked)} />
                Late employees
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200 xl:col-span-2">
            <div className="border-b border-slate-200 px-6 py-4"><h2 className="text-lg font-semibold text-slate-900">Live Activity</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["Employee", "Employee ID", "Clock In", "Clock Out", "Hours", "Status", "Date"].map((heading) => (
                      <th key={heading} className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr><td colSpan="7" className="px-6 py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                  ) : records.length ? (
                    records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-slate-900">{record.employee_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.employee_code || "—"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.clock_in_time || "—"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.clock_out_time || "—"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {record.total_hours != null ? `${record.total_hours}h` : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              statusStyles[record.display_status] || statusStyles.Working
                            }`}
                          >
                            {record.display_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.date ? new Date(record.date).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="7" className="px-6 py-10 text-center text-slate-500">No attendance records for this date.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2">
              <FaClock className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-900">Activity Timeline</h2>
            </div>
            <div className="space-y-4">
              {activityFeed.length ? activityFeed.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-medium text-slate-900">{item.employee_name}</p>
                  <p className="text-sm text-slate-500">{item.employee_code}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.type === "clock_in" ? "Clocked in" : "Clocked out"} at <span className="font-semibold">{item.time}</span></p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.at).toLocaleTimeString()}</p>
                </div>
              )) : (
                <p className="text-sm text-slate-500">Live clock-in and clock-out events will appear here automatically.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Tracking;
