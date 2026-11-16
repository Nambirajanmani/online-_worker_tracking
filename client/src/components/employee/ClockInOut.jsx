import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaCheckCircle, FaClock } from "react-icons/fa";
import { api } from "../../lib/api";

const formatTimeDisplay = (timeStr, createdAt) => {
  if (!timeStr) return "--";

  if (createdAt) {
    const rawDateStr = String(createdAt);
    const dateStr = !rawDateStr.endsWith("Z") && !rawDateStr.includes("+") ? rawDateStr + "Z" : rawDateStr;
    const date = new Date(dateStr);
    if (!Number.isNaN(date.getTime())) {
      const utcHours = date.getUTCHours();
      const [h] = timeStr.split(":").map(Number);
      // If timeStr was saved in UTC directly on a cloud server (diff <= 1 hour with UTC)
      if (Math.abs(utcHours - h) <= 1) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
      }
    }
  }

  return timeStr;
};

const getClientTimePayload = () => {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  const client_time = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  const client_date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  return { client_time, client_date, timezone };
};

const ClockInOut = ({ attendance, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const payload = getClientTimePayload();
      await api.post("/employee/attendance/clock-in", payload);
      toast.success("Clocked in successfully");
      await onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock in");
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const payload = getClientTimePayload();
      await api.put("/employee/attendance/clock-out", payload);
      toast.success("Clocked out successfully");
      await onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to clock out");
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = attendance?.clock_in_time && !attendance?.clock_out_time;
  const clockInDisplay = formatTimeDisplay(attendance?.clock_in_time, attendance?.created_at);
  const clockOutDisplay = formatTimeDisplay(attendance?.clock_out_time, attendance?.updated_at);

  return (
    <div className="rounded-[2rem] bg-gradient-to-br from-amber-50 via-white to-sky-50 p-8 shadow-sm ring-1 ring-stone-200">
      <div className="flex flex-col items-center gap-6 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-stone-500">Attendance</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">Manage your work day</h2>
          <p className="mt-2 text-stone-600">Clock in when you start and clock out when you finish.</p>
        </div>

        {attendance?.clock_in_time ? (
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            {attendance.clock_out_time ? (
              <>
                <div className="mb-3 flex justify-center text-stone-700">
                  <FaClock className="text-2xl" />
                </div>
                <p className="text-stone-700">
                  Clocked out at <span className="font-semibold">{clockOutDisplay}</span>
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Total hours: <span className="font-semibold">{attendance.total_hours || 0}</span>
                </p>
              </>
            ) : (
              <>
                <div className="mb-3 flex justify-center text-emerald-600">
                  <FaCheckCircle className="text-2xl" />
                </div>
                <p className="text-stone-700">
                  Clocked in at <span className="font-semibold">{clockInDisplay}</span>
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm text-amber-900">
            You have not clocked in yet today.
          </div>
        )}

        <button
          type="button"
          onClick={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
          className={`rounded-full px-10 py-4 text-lg font-semibold text-white transition ${
            isClockedIn
              ? "bg-rose-600 hover:bg-rose-700"
              : "bg-emerald-600 hover:bg-emerald-700"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {loading ? "Processing..." : isClockedIn ? "Clock Out" : "Clock In"}
        </button>
      </div>
    </div>
  );
};

export default ClockInOut;
