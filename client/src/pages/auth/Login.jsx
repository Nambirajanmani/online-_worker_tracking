import React, { useState } from "react";
import { FaLock, FaUser } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../store/slices/authSlice";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(login(formData));

    if (login.fulfilled.match(result)) {
      const user = result.payload.user;
      const role = user?.role;
      
      if (role) {
        navigate(role === "admin" ? "/admin" : "/employee");
      } else {
        console.error("User role not found in response:", result.payload);
        navigate("/employee"); // Default fallback
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.25),_transparent_30%),linear-gradient(135deg,#0f172a,#1c1917)] p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl shadow-slate-950/20">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-amber-500">
            <FaUser className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
          <p className="mt-2 text-slate-500">Sign in to the employee tracking portal.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <FaUser />
              </span>
              <input
                className="input-field pl-10"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <FaLock />
              </span>
              <input
                className="input-field pl-10"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-sky-600 hover:text-sky-700">
            Forgot password?
          </Link>
        </div>

        <div className="mt-6 rounded-2xl bg-stone-100 p-4 text-center text-xs text-stone-600">
          <p className="font-semibold text-stone-800">Demo credentials</p>
          <p className="mt-1">Admin: admin@example.com / Admin@123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
