import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import employeeReducer from "./slices/employeeSlice";
import notificationReducer from "./slices/notificationSlice";
import taskReducer from "./slices/taskSlice";
import reportReducer from "./slices/reportSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    tasks: taskReducer,
    notifications: notificationReducer,
    reports: reportReducer
  }
});
