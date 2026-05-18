import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../store/slices/authSlice";

const navItems = [
  { label: "Dashboard", path: "/employee" },
  { label: "Attendance", path: "/employee/attendance" },
  { label: "Tasks", path: "/employee/tasks" },
  { label: "Time Tracker", path: "/employee/time-tracker" },
  { label: "Leave", path: "/employee/leave" },
  { label: "Reports", path: "/employee/reports" }
];

const EmployeeLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/employee" className="text-2xl font-semibold text-stone-900">
              Team Pulse
            </Link>
            <p className="text-sm text-stone-500">
              {user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Employee"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/employee"}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm transition ${
                    isActive
                      ? "bg-amber-500 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button className="btn-secondary" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  );
};

export default EmployeeLayout;
