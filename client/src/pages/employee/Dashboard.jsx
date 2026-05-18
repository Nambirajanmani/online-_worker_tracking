import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { FaCalendarAlt, FaChartLine, FaCheckCircle, FaClock } from "react-icons/fa";
import { useSelector } from "react-redux";
import ClockInOut from "../../components/employee/ClockInOut";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import TaskList from "../../components/employee/TaskList";
import { api } from "../../lib/api";

const Dashboard = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [attendance, setAttendance] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalHours: 0,
    pendingLeaves: 0,
    productivity: 0
  });

  const fetchEmployeeData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [attendanceRes, tasksRes, leavesRes, timeEntriesRes] = await Promise.all([
        api.get("/employee/attendance/today", { headers }),
        api.get("/employee/tasks", { headers }),
        api.get("/employee/leaves?status=pending", { headers }),
        api.get("/employee/time-summary?period=week", { headers })
      ]);

      const tasks = Array.isArray(tasksRes.data?.data) ? tasksRes.data.data : [];
      const completed = tasks.filter((task) => task.status === "completed").length;
      const productivity = tasks.length ? ((completed / tasks.length) * 100).toFixed(1) : 0;

      setAttendance(attendanceRes.data?.data || null);
      setRecentTasks(tasks.slice(0, 5));
      setStats({
        completedTasks: completed,
        totalHours: timeEntriesRes.data?.data?.totalHours || 0,
        pendingLeaves: Array.isArray(leavesRes.data?.data) ? leavesRes.data.data.length : 0,
        productivity
      });
    } catch (error) {
      console.error("Failed to fetch employee dashboard", error);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [token]);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Good morning" : greetingHour < 18 ? "Good afternoon" : "Good evening";

  const cards = [
    { label: "Completed Tasks", value: stats.completedTasks, icon: FaCheckCircle, tone: "bg-emerald-100 text-emerald-700" },
    { label: "Total Hours", value: stats.totalHours, icon: FaClock, tone: "bg-sky-100 text-sky-700" },
    { label: "Productivity", value: `${stats.productivity}%`, icon: FaChartLine, tone: "bg-amber-100 text-amber-700" },
    { label: "Pending Leaves", value: stats.pendingLeaves, icon: FaCalendarAlt, tone: "bg-rose-100 text-rose-700" }
  ];

  return (
    <EmployeeLayout>
      <div className="p-6">
        <div className="mb-8 rounded-[2rem] bg-[linear-gradient(135deg,#0f766e,#0f172a)] p-8 text-white">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-teal-100">Today</p>
              <h1 className="mt-3 text-4xl font-semibold">
                {greeting}, {user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Employee"}
              </h1>
              <p className="mt-2 text-teal-100">{format(new Date(), "EEEE, MMMM do, yyyy")}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 text-center">
              <FaCalendarAlt className="mx-auto text-2xl" />
              <p className="mt-2 text-sm">{format(new Date(), "MMM dd")}</p>
            </div>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-stone-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-stone-500">{card.label}</p>
                  <p className="mt-3 text-4xl font-semibold text-stone-900">{card.value}</p>
                </div>
                <div className={`rounded-full p-3 ${card.tone}`}>
                  <card.icon className="text-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <ClockInOut attendance={attendance} onUpdate={fetchEmployeeData} />
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-stone-900">Recent tasks</h2>
          </div>
          <TaskList tasks={recentTasks} />
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default Dashboard;
