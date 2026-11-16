import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import { logout } from "../../store/slices/authSlice";

const navItems = [
  { label: "Dashboard", path: "/admin" },
  { label: "Live Monitoring", path: "/admin/live-monitoring" },
  { label: "Employees", path: "/admin/employees" },
  { label: "Attendance", path: "/admin/tracking" },
  { label: "Tasks", path: "/admin/tasks" },
  { label: "Reports", path: "/admin/reports" },
  { label: "Leaves", path: "/admin/leaves" },
  { label: "Settings", path: "/admin/settings" }
];

const AdminLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden w-72 flex-shrink-0 bg-slate-950 text-slate-100 lg:block">
          <div className="border-b border-slate-800 px-6 py-6">
            <Link to="/admin" className="text-xl font-semibold tracking-wide">
              Workforce Hub
            </Link>
            <p className="mt-1 text-sm text-slate-400">Admin workspace</p>
          </div>
          <nav className="space-y-1 px-4 py-6">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive ? "bg-sky-500 text-white shadow-sm" : "text-slate-300 hover:bg-slate-900"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation Drawer / Overlay */}
        {mobileNavOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileNavOpen(false)}
            />

            {/* Slide-over panel */}
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-slate-950 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
                <div>
                  <Link
                    to="/admin"
                    onClick={() => setMobileNavOpen(false)}
                    className="text-lg font-bold tracking-wide text-white"
                  >
                    Workforce Hub
                  </Link>
                  <p className="text-xs text-slate-400">Admin Workspace</p>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  aria-label="Close navigation"
                >
                  <FaTimes className="text-lg" />
                </button>
              </div>

              <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/admin"}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                        isActive ? "bg-sky-500 text-white font-semibold" : "text-slate-300 hover:bg-slate-900"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="border-t border-slate-800 p-4">
                <button
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    handleLogout();
                  }}
                  className="w-full rounded-lg bg-rose-600/20 px-4 py-2.5 text-center text-sm font-semibold text-rose-300 hover:bg-rose-600 hover:text-white transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                {/* Mobile menu toggle */}
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(true)}
                  aria-label="Open navigation menu"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
                >
                  <FaBars className="text-lg" />
                </button>

                <div>
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                    {user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Admin"}
                  </h2>
                </div>
              </div>

              <button className="btn-secondary !px-4 !py-2 !text-sm" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-x-hidden">{children}</main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
