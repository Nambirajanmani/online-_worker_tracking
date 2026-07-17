import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  fetchTasks,
  createTask,
  updateTask,
  deleteTask,
  fetchTaskStats,
} from "../../store/slices/taskSlice";
import { api } from "../../lib/api";
import toast from "react-hot-toast";
import { FiPlus, FiSearch, FiTrash2, FiEdit2, FiEye } from "react-icons/fi";

const emptyForm = {
  employee_id: "",
  employee_name: "",
  task_title: "",
  task_description: "",
  priority: "medium",
  start_date: "",
  due_date: "",
};

const Tasks = () => {
  const dispatch = useDispatch();
  const { tasks, stats, loading } = useSelector((state) => state.tasks);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({ status: "", priority: "", search: "" });

  // Fetch employees for dropdown
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const { data } = await api.get("/admin/employees");
        setEmployees(data.data || []);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to fetch employees");
      }
    };
    fetchEmployees();
  }, []);

  // Fetch tasks and stats on mount and when filters change
  useEffect(() => {
    dispatch(fetchTasks(filters));
    dispatch(fetchTaskStats());
  }, [dispatch, filters]);

  // Handle employee selection
  const handleEmployeeChange = (e) => {
    const selectedEmp = employees.find((emp) => emp.id === parseInt(e.target.value));
    if (selectedEmp) {
      setFormData({
        ...formData,
        employee_id: selectedEmp.id,
        employee_name: `${selectedEmp.first_name} ${selectedEmp.last_name}`,
      });
    }
  };

  // Open edit modal
  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      employee_id: task.employee_id || "",
      employee_name: task.employee_name || "",
      task_title: task.task_title || "",
      task_description: task.task_description || "",
      priority: task.priority || "medium",
      start_date: task.start_date ? task.start_date.split("T")[0] : "",
      due_date: task.due_date ? task.due_date.split("T")[0] : "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingTask(null);
    setFormData(emptyForm);
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.task_title) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.start_date && formData.due_date) {
      if (new Date(formData.due_date) < new Date(formData.start_date)) {
        toast.error("Due date must be greater than or equal to start date");
        return;
      }
    }

    try {
      if (editingTask) {
        await dispatch(updateTask({ id: editingTask.id, taskData: formData })).unwrap();
      } else {
        await dispatch(createTask(formData)).unwrap();
      }
      closeForm();
      dispatch(fetchTasks(filters));
    } catch (error) {
      console.error("Failed to save task:", error);
    }
  };

  // Handle task deletion
  const handleDelete = async (taskId) => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      try {
        await dispatch(deleteTask(taskId)).unwrap();
        dispatch(fetchTasks(filters));
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchStatus = !filters.status || task.status === filters.status;
    const matchPriority = !filters.priority || task.priority === filters.priority;
    const matchSearch =
      !filters.search ||
      task.task_title?.toLowerCase().includes(filters.search.toLowerCase()) ||
      task.employee_name?.toLowerCase().includes(filters.search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      case "urgent": return "bg-rose-100 text-rose-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-orange-100 text-orange-800";
      case "on-hold": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateStr) =>
    dateStr ? new Date(dateStr).toLocaleDateString() : "—";

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {[
            { label: "Total Tasks", value: stats?.total || 0, color: "bg-blue-500" },
            { label: "Pending", value: stats?.pending || 0, color: "bg-orange-500" },
            { label: "In Progress", value: stats?.in_progress || 0, color: "bg-purple-500" },
            { label: "Completed", value: stats?.completed || 0, color: "bg-green-500" },
            { label: "On Hold", value: stats?.on_hold || 0, color: "bg-gray-500" },
            { label: "Overdue", value: stats?.overdue || 0, color: "bg-red-500" },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} text-white p-6 rounded-lg shadow`}>
              <p className="text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Create / Edit Task Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">
              {editingTask ? "Edit Task" : "Create New Task"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Employee Dropdown */}
                <div>
                  <label className="block text-sm font-medium mb-1">Employee *</label>
                  <select
                    value={formData.employee_id}
                    onChange={handleEmployeeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task Title */}
                <div>
                  <label className="block text-sm font-medium mb-1">Task Title *</label>
                  <input
                    type="text"
                    value={formData.task_title}
                    onChange={(e) => setFormData({ ...formData, task_title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.task_description}
                  onChange={(e) => setFormData({ ...formData, task_description: e.target.value })}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingTask ? "Update Task" : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks List Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Tasks</h2>
            <button
              onClick={() => { setEditingTask(null); setFormData(emptyForm); setShowForm(!showForm); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <FiPlus /> Create Task
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <button
              onClick={() => setFilters({ status: "", priority: "", search: "" })}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
            >
              Reset Filters
            </button>
          </div>

          {/* Tasks Table */}
          {loading ? (
            <p className="text-center py-4">Loading tasks...</p>
          ) : filteredTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Task Title</th>
                    <th className="px-4 py-2 text-left">Employee</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Start Date</th>
                    <th className="px-4 py-2 text-left">Due Date</th>
                    <th className="px-4 py-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium">{task.task_title}</p>
                        <p className="text-sm text-gray-600">
                          {task.task_description?.substring(0, 50)}{task.task_description?.length > 50 ? "..." : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">{task.employee_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                          {task.status.replace("-", " ").charAt(0).toUpperCase() + task.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(task.start_date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(task.due_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-3">
                          {/* View */}
                          <button
                            title="View"
                            onClick={() => setViewingTask(task)}
                            className="text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            <FiEye size={16} />
                          </button>
                          {/* Edit */}
                          <button
                            title="Edit"
                            onClick={() => handleEdit(task)}
                            className="text-sky-600 hover:text-sky-700 transition-colors"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          {/* Delete */}
                          <button
                            title="Delete"
                            onClick={() => handleDelete(task.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center py-4 text-gray-600">No tasks found. Create your first task!</p>
          )}
        </div>
      </div>

      {/* View Task Modal */}
      {viewingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-900">Task Details</h2>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                onClick={() => setViewingTask(null)}
              >
                &times;
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Task Title</p>
              <p className="text-lg font-semibold text-slate-900">{viewingTask.task_title}</p>
            </div>

            {viewingTask.task_description && (
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingTask.task_description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ["Employee", viewingTask.employee_name || "N/A"],
                ["Priority",
                  <span className={`px-3 py-1 rounded text-xs font-medium ${getPriorityColor(viewingTask.priority)}`}>
                    {viewingTask.priority?.charAt(0).toUpperCase() + viewingTask.priority?.slice(1)}
                  </span>
                ],
                ["Status",
                  <span className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(viewingTask.status)}`}>
                    {viewingTask.status?.replace("-", " ").charAt(0).toUpperCase() + viewingTask.status?.slice(1)}
                  </span>
                ],
                ["Start Date", formatDate(viewingTask.start_date)],
                ["Due Date", formatDate(viewingTask.due_date)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                  <div className="text-sm font-medium text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                onClick={() => setViewingTask(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Tasks;
