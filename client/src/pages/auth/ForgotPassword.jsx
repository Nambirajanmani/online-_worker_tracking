import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaEnvelope } from "react-icons/fa";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
      toast.success("Password reset email sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-xl">
        <Link to="/login" className="text-sm font-medium text-sky-600 hover:text-sky-700">
          Back to login
        </Link>
        <div className="mb-8 mt-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-sky-500">
            <FaEnvelope className="text-3xl text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Forgot password?</h1>
          <p className="mt-2 text-slate-500">Enter your email to receive a reset link.</p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              className="input-field"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl bg-emerald-50 p-4 text-center text-emerald-700">
            Password reset instructions have been sent to your email.
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
