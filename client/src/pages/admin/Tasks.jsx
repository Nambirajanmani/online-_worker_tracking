import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { fetchTasks } from "../../store/slices/taskSlice";

const Tasks = () => {
  const dispatch = useDispatch();
  const { tasks, loading } = useSelector((state) => state.tasks);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <h1 className="text-3xl font-semibold text-slate-900">Tasks</h1>
          <p className="mt-2 text-slate-600">Current tasks assigned across the team.</p>
          <div className="mt-6 space-y-4">
            {loading ? (
              <div className="spinner" />
            ) : tasks.length ? (
              tasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-semibold text-slate-900">{task.title}</h2>
                      <p className="text-sm text-slate-500">{task.description || "No description"}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {task.status || "pending"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No tasks found.</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Tasks;
