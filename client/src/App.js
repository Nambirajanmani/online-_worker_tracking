import React from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "./store/slices/authSlice";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import AdminDashboard from "./pages/admin/Dashboard";
import Employees from "./pages/admin/Employees";
import LeaveManagement from "./pages/admin/LeaveManagement";
import Reports from "./pages/admin/Reports";
import AdminReportDetail from "./pages/admin/AdminReportDetail";
import AdminSettings from "./pages/admin/Settings";
import Tasks from "./pages/admin/Tasks";
import Tracking from "./pages/admin/Tracking";
import Attendance from "./pages/employee/Attendance";
import EmployeeDashboard from "./pages/employee/Dashboard";
import LeaveRequest from "./pages/employee/LeaveRequest";
import MyReports from "./pages/employee/MyReports";
import ReportSubmission from "./pages/employee/ReportSubmission";
import EmployeeReportDetail from "./pages/employee/EmployeeReportDetail";
import MyTasks from "./pages/employee/MyTasks";
import TimeTracker from "./pages/employee/TimeTracker";
import SessionHistory from "./pages/employee/SessionHistory";
import LiveMonitoring from "./pages/admin/LiveMonitoring";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user || !user.role) {
    if (isAuthenticated) {
      dispatch(logout());
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const isAdmin = user.role === "admin" || user.department === "Management";
    const fallback = isAdmin ? "/admin" : "/employee";
    // Show access denied message
    toast.error("Access Denied: You don't have permission to access this page.");
    return <Navigate to={fallback} replace />;
  }

  return children;
};

const HomeRedirect = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated || !user || !user.role) {
    if (isAuthenticated) {
      dispatch(logout());
    }
    return <Navigate to="/login" replace />;
  }

  // Management department users should go to Admin Dashboard
  const isAdmin = user.role === "admin" || user.department === "Management";
  return <Navigate to={isAdmin ? "/admin" : "/employee"} replace />;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/employees"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Employees />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tracking"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Tracking />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/report/:id"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminReportDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/live-monitoring"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <LiveMonitoring />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tasks"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/leaves"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <LeaveManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/attendance"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <Attendance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/tasks"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <MyTasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/time-tracker"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <TimeTracker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/session-history"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <SessionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/leave"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <LeaveRequest />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/reports"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <MyReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/my-reports"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <MyReports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/report-submission"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <ReportSubmission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employee/report/:id"
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <EmployeeReportDetail />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
