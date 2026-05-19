import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logout } from "../../store/slices/authSlice";

const navItems = [
  { label: "Dashboard", path: "/admin" },
  { label: "Employees", path: "/admin/employees" },
  { label: "Attendance", path: "/admin/tracking" },
  { label: "Tasks", path: "/admin/tasks" },
  { label: "Reports", path: "/admin/reports" },
  { label: "Leaves", path: "/admin/leaves" },
  { label: "Settings", path: "/admin/settings" }
];

const AdminLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 bg-slate-950 text-slate-100 lg:block">
          <div className="border-b border-slate-800 px-6 py-6">
            <Link to="/admin" className="text-xl font-semibold tracking-wide">
              Workforce Hub
            </Link>
            <p className="mt-2 text-sm text-slate-400">Admin workspace</p>
          </div>
          <nav className="space-y-1 px-4 py-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm transition ${
                    isActive ? "bg-sky-500 text-white" : "text-slate-300 hover:bg-slate-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 sm:px-6">
              <div>
                <p className="text-sm text-slate-500">Signed in as</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Admin"}
                </h2>
              </div>
              <button className="btn-secondary" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
