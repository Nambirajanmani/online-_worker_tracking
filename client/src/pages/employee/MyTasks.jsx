import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import TaskList from "../../components/employee/TaskList";
import { fetchTasks } from "../../store/slices/taskSlice";

const MyTasks = () => {
  const dispatch = useDispatch();
  const { tasks } = useSelector((state) => state.tasks);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  return (
    <EmployeeLayout>
      <div className="p-6">
        <h1 className="text-3xl font-semibold text-stone-900">My Tasks</h1>
        <p className="mt-2 text-stone-600">Tasks assigned to you and their current status.</p>
        <div className="mt-6">
          <TaskList tasks={tasks} />
        </div>
      </div>
    </EmployeeLayout>
  );
};

export default MyTasks;
