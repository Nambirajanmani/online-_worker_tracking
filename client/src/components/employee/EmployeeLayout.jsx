import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import { logout } from "../../store/slices/authSlice";

const navItems = [
  { label: "Dashboard", path: "/employee" },
  { label: "Attendance", path: "/employee/attendance" },
  { label: "Tasks", path: "/employee/tasks" },
  { label: "Time Tracker", path: "/employee/time-tracker" },
  { label: "Session History", path: "/employee/session-history" },
  { label: "Leave", path: "/employee/leave" },
  { label: "Reports", path: "/employee/reports" }
];

const EmployeeLayout = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <Link to="/employee" className="text-xl sm:text-2xl font-semibold text-stone-900">
              Employee Portal
            </Link>
            <p className="text-xs sm:text-sm text-stone-500">
              {user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || "Employee"}
            </p>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/employee"}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-amber-500 text-white"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <button className="btn-secondary !px-4 !py-1.5 !text-sm" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="rounded-xl border border-stone-200 bg-stone-50 p-2 text-stone-700 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-stone-200 bg-white px-4 py-4 shadow-lg lg:hidden">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/employee"}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-amber-500 text-white font-semibold"
                        : "text-stone-700 hover:bg-stone-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full rounded-xl bg-stone-100 px-4 py-2.5 text-left text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-7xl">{children}</main>
    </div>
  );
};

export default EmployeeLayout;
