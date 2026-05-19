import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import {
  fetchMyTasks,
  fetchMyTaskStats,
  updateTask,
  addTaskUpdate,
} from "../../store/slices/taskSlice";
import toast from "react-hot-toast";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

const MyTasks = () => {
  const dispatch = useDispatch();
  const { tasks, stats, loading } = useSelector((state) => state.tasks);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [commentForm, setCommentForm] = useState({});
  const [filters, setFilters] = useState({ status: "" });

  useEffect(() => {
    dispatch(fetchMyTasks());
    dispatch(fetchMyTaskStats());
  }, [dispatch]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await dispatch(
        updateTask({
          id: taskId,
          taskData: { status: newStatus },
        })
      ).unwrap();
      dispatch(fetchMyTasks());
      dispatch(fetchMyTaskStats());
      toast.success("Task status updated");
    } catch (error) {
      console.error("Failed to update task status:", error);
    }
  };

  const handleAddComment = async (taskId) => {
    const comment = commentForm[taskId];
    if (!comment?.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    try {
      await dispatch(
        addTaskUpdate({
          id: taskId,
          updateData: { comment },
        })
      ).unwrap();
      setCommentForm({ ...commentForm, [taskId]: "" });
      dispatch(fetchMyTasks());
      toast.success("Comment added");
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (!filters.status) return true;
    return task.status === filters.status;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
      case "urgent":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "on-hold":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <EmployeeLayout>
      <div className="p-6 space-y-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            {
              label: "Total Tasks",
              value: stats?.total || 0,
              color: "bg-blue-500",
            },
            {
              label: "Pending",
              value: stats?.pending || 0,
              color: "bg-orange-500",
            },
            {
              label: "In Progress",
              value: stats?.in_progress || 0,
              color: "bg-purple-500",
            },
            {
              label: "Completed",
              value: stats?.completed || 0,
              color: "bg-green-500",
            },
            {
              label: "Overdue",
              value: stats?.overdue || 0,
              color: "bg-red-500",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.color} text-white p-6 rounded-lg shadow`}
            >
              <p className="text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tasks Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-semibold">My Tasks</h1>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>

          {loading ? (
            <p className="text-center py-4">Loading tasks...</p>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition"
                >
                  {/* Task Header */}
                  <div
                    className="p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
                    onClick={() =>
                      setExpandedTaskId(
                        expandedTaskId === task.id ? null : task.id
                      )
                    }
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{task.task_title}</h3>
                      <p className="text-sm text-gray-600">
                        {task.task_description?.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded text-xs font-medium ${getPriorityColor(
                          task.priority
                        )}`}
                      >
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded text-xs font-medium ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status
                          .replace("-", " ")
                          .charAt(0)
                          .toUpperCase() + task.status.slice(1)}
                      </span>
                      {expandedTaskId === task.id ? (
                        <FiChevronUp />
                      ) : (
                        <FiChevronDown />
                      )}
                    </div>
                  </div>

                  {/* Task Details (Expanded) */}
                  {expandedTaskId === task.id && (
                    <div className="p-4 border-t border-gray-200 space-y-4">
                      {/* Task Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-600">Start Date</p>
                          <p className="font-medium">
                            {task.start_date
                              ? new Date(task.start_date).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Due Date</p>
                          <p className="font-medium">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString()
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">
                            Estimated Hours
                          </p>
                          <p className="font-medium">
                            {task.estimated_hours || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">
                            Actual Hours
                          </p>
                          <p className="font-medium">
                            {task.actual_hours || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Full Description */}
                      <div>
                        <p className="text-xs text-gray-600 mb-1">
                          Description
                        </p>
                        <p className="text-sm">{task.task_description}</p>
                      </div>

                      {/* Status Update */}
                      <div>
                        <p className="text-xs text-gray-600 mb-2">
                          Update Status
                        </p>
                        <div className="flex gap-2">
                          {[
                            "pending",
                            "in-progress",
                            "completed",
                            "on-hold",
                          ].map((status) => (
                            <button
                              key={status}
                              onClick={() =>
                                handleStatusChange(task.id, status)
                              }
                              className={`px-3 py-1 rounded text-xs font-medium transition ${
                                task.status === status
                                  ? getStatusColor(status)
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              {status
                                .replace("-", " ")
                                .charAt(0)
                                .toUpperCase() + status.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Add Comment */}
                      <div>
                        <p className="text-xs text-gray-600 mb-2">
                          Add Comment
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={commentForm[task.id] || ""}
                            onChange={(e) =>
                              setCommentForm({
                                ...commentForm,
                                [task.id]: e.target.value,
                              })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => handleAddComment(task.id)}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-gray-600">
              No tasks assigned to you yet.
            </p>
          )}
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default MyTasks;
