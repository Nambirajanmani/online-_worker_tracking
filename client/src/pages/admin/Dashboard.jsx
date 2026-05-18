import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../lib/api";

const Dashboard = () => {
  const { token } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    activeTasks: 0,
    pendingLeaves: 0,
    totalProjects: 0,
    completionRate: 0
  });
  const [attendanceData, setAttendanceData] = useState([]);
  const [taskDistribution, setTaskDistribution] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [employeesRes, attendanceRes, tasksRes, leavesRes, projectsRes] = await Promise.all([
          api.get("/admin/employees", { headers }),
          api.get("/admin/attendance/today", { headers }),
          api.get("/admin/tasks", { headers }),
          api.get("/admin/leaves?status=pending", { headers }),
          api.get("/admin/projects", { headers })
        ]);

        const employees = Array.isArray(employeesRes.data?.data) ? employeesRes.data.data : [];
        const tasks = Array.isArray(tasksRes.data?.data) ? tasksRes.data.data : [];
        const leaves = Array.isArray(leavesRes.data?.data) ? leavesRes.data.data : [];
        const projects = Array.isArray(projectsRes.data?.data) ? projectsRes.data.data : [];
        const completedTasks = tasks.filter((task) => task.status === "completed").length;
        const totalTasks = tasks.length;
        const completionRate = totalTasks ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

        setStats({
          totalEmployees: employees.length,
          presentToday: attendanceRes.data?.data?.count || 0,
          activeTasks: tasks.filter((task) => task.status !== "completed").length,
          pendingLeaves: leaves.length,
          totalProjects: projects.length,
          completionRate
        });

        setAttendanceData([
          { day: "Mon", present: 42, absent: 8, late: 3 },
          { day: "Tue", present: 45, absent: 5, late: 2 },
          { day: "Wed", present: 44, absent: 6, late: 4 },
          { day: "Thu", present: 47, absent: 3, late: 1 },
          { day: "Fri", present: 43, absent: 7, late: 2 }
        ]);

        setTaskDistribution([
          { name: "Completed", value: completedTasks, color: "#10b981" },
          { name: "In Progress", value: tasks.filter((task) => task.status === "in-progress").length, color: "#0ea5e9" },
          { name: "Pending", value: tasks.filter((task) => task.status === "pending").length, color: "#f59e0b" }
        ]);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  const statCards = [
    { title: "Total Employees", value: stats.totalEmployees },
    { title: "Present Today", value: stats.presentToday },
    { title: "Active Tasks", value: stats.activeTasks },
    { title: "Pending Leaves", value: stats.pendingLeaves }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="spinner" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen p-6">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700">Overview</p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Admin dashboard</h1>
          <p className="mt-2 text-slate-600">Live view of workforce activity and delivery progress.</p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => (
            <div key={stat.title} className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-medium text-slate-500">{stat.title}</p>
              <p className="mt-4 text-4xl font-semibold text-slate-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Weekly attendance</h2>
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="present" fill="#10b981" />
                  <Bar dataKey="absent" fill="#ef4444" />
                  <Bar dataKey="late" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Task distribution</h2>
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskDistribution} dataKey="value" nameKey="name" outerRadius={110} label>
                    {taskDistribution.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[1.5rem] bg-gradient-to-r from-sky-600 to-sky-800 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-sky-100">Delivery</p>
            <p className="mt-4 text-5xl font-semibold">{stats.completionRate}%</p>
            <p className="mt-2 text-sky-100">Project completion rate</p>
          </div>
          <div className="rounded-[1.5rem] bg-gradient-to-r from-amber-500 to-orange-600 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-amber-100">Projects</p>
            <p className="mt-4 text-5xl font-semibold">{stats.totalProjects}</p>
            <p className="mt-2 text-amber-100">Active projects</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
