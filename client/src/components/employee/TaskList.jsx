import React from "react";

const statusClasses = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  "in-progress": "bg-sky-100 text-sky-700"
};

const TaskList = ({ tasks = [] }) => {
  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
        No tasks available right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900">{task.title}</h3>
              <p className="mt-1 text-sm text-stone-600">{task.description || "No description provided."}</p>
            </div>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                statusClasses[task.status] || "bg-stone-100 text-stone-700"
              }`}
            >
              {task.status || "pending"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TaskList;
