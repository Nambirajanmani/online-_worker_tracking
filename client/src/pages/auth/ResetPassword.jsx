import React, { useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../../lib/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, newPassword: password });
      toast.success("Password reset successful");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-slate-900">Reset password</h1>
        <p className="mt-2 text-slate-500">Create a new password for your account.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            className="input-field"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            required
          />
          <input
            className="input-field"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm password"
            required
          />
          <button type="submit" disabled={loading || !token} className="btn-primary w-full justify-center">
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
        {!token && <p className="mt-4 text-sm text-rose-600">Missing reset token in the URL.</p>}
        <Link to="/login" className="mt-5 inline-block text-sm text-sky-600 hover:text-sky-700">
          Return to login
        </Link>
      </div>
    </div>
  );
};

export default ResetPassword;
