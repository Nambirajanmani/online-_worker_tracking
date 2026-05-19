import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import toast from "react-hot-toast";
import { FaEdit, FaPaperPlane, FaTimesCircle } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import EmployeeLayout from "../../components/employee/EmployeeLayout";
import { api } from "../../lib/api";
import { connectSocket } from "../../lib/socket";
import { addNotification } from "../../store/slices/notificationSlice";

const LEAVE_TYPES = [
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "paid", label: "Paid Leave" },
  { value: "unpaid", label: "Unpaid Leave" }
];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-200 text-slate-600"
};

const uploadOrigin = () => (process.env.REACT_APP_API_URL || "").replace(/\/api\/?$/, "") || "";

const LeaveRequest = () => {
  const dispatch = useDispatch();
  const { token, user } = useSelector((state) => state.auth);
  const [profile, setProfile] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leave_type: "casual",
    from_date: format(new Date(), "yyyy-MM-dd"),
    to_date: format(new Date(), "yyyy-MM-dd"),
    reason: "",
    attachment: null
  });
  const [editRow, setEditRow] = useState(null);

  const employeeCode = profile?.employee_code || user?.employeeCode || "—";
  const employeeName =
    profile?.first_name != null
      ? `${profile.first_name} ${profile.last_name || ""}`.trim()
      : user?.name || "—";

  const totalDays = useMemo(() => {
    try {
      const a = parseISO(form.from_date);
      const b = parseISO(form.to_date);
      if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
      return differenceInCalendarDays(b, a) + 1;
    } catch {
      return 0;
    }
  }, [form.from_date, form.to_date]);

  const calendarMarks = useMemo(() => {
    const set = new Set();
    leaves.forEach((row) => {
      if (row.status === "cancelled" || row.status === "rejected") return;
      let d = parseISO(row.from_date || row.start_date);
      const end = parseISO(row.to_date || row.end_date);
      while (d <= end) {
        set.add(format(d, "yyyy-MM-dd"));
        d = addDays(d, 1);
      }
    });
    return set;
  }, [leaves]);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, leavesRes] = await Promise.all([
        api.get("/employee/profile"),
        api.get("/employee/leaves")
      ]);
      setProfile(profileRes.data?.data || null);
      setLeaves(Array.isArray(leavesRes.data?.data) ? leavesRes.data.data : []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load leave data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    const onStatus = (payload) => {
      const { leave, status } = payload;
      toast.success(
        status === "approved" ? "Your leave request was approved." : "Your leave request was rejected."
      );
      dispatch(
        addNotification({
          title: status === "approved" ? "Leave approved" : "Leave rejected",
          message: `${leave?.from_date} → ${leave?.to_date}`,
          type: "leave"
        })
      );
      setLeaves((current) => {
        const idx = current.findIndex((r) => r.id === leave?.id);
        if (idx === -1) return [leave, ...current];
        const next = [...current];
        next[idx] = { ...next[idx], ...leave };
        return next;
      });
    };
    const onSync = () => {
      loadData();
    };
    socket.on("leave:status", onStatus);
    socket.on("leave:sync", onSync);
    return () => {
      socket.off("leave:status", onStatus);
      socket.off("leave:sync", onSync);
    };
  }, [token, dispatch, loadData]);

  const resetForm = () => {
    setForm({
      leave_type: "casual",
      from_date: format(new Date(), "yyyy-MM-dd"),
      to_date: format(new Date(), "yyyy-MM-dd"),
      reason: "",
      attachment: null
    });
  };

  const submitLeave = async (event) => {
    event.preventDefault();
    if (!form.reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    if (totalDays < 1) {
      toast.error("Invalid date range");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("leave_type", form.leave_type);
      fd.append("from_date", form.from_date);
      fd.append("to_date", form.to_date);
      fd.append("reason", form.reason.trim());
      if (form.attachment) fd.append("attachment", form.attachment);

      if (editRow) {
        await api.put(`/employee/leaves/${editRow.id}`, fd);
        toast.success("Leave request updated");
        setEditRow(null);
      } else {
        await api.post("/employee/leaves", fd);
        toast.success("Leave request submitted");
      }
      resetForm();
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const cancelLeave = async (id) => {
    if (!window.confirm("Cancel this leave request?")) return;
    try {
      await api.put(`/employee/leaves/${id}/cancel`);
      toast.success("Leave cancelled");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Cancel failed");
    }
  };

  const openEdit = (row) => {
    if (row.status !== "pending") return;
    setEditRow(row);
    setForm({
      leave_type: row.leave_type,
      from_date: row.from_date || row.start_date,
      to_date: row.to_date || row.end_date,
      reason: row.reason || "",
      attachment: null
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return null;
    const key = format(date, "yyyy-MM-dd");
    return calendarMarks.has(key) ? "leave-day" : null;
  };

  return (
    <EmployeeLayout>
      <div className="p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">Leave requests</h1>
          <p className="mt-1 text-stone-600">Submit requests, track approvals, and manage your time off.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
              <h2 className="text-lg font-semibold text-stone-900">
                {editRow ? "Edit leave request" : "New leave request"}
              </h2>
              <form onSubmit={submitLeave} className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Employee ID</label>
                    <input type="text" readOnly value={employeeCode} className="input-field bg-stone-50" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Employee name</label>
                    <input type="text" readOnly value={employeeName} className="input-field bg-stone-50" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-stone-700">Leave type</label>
                    <select
                      value={form.leave_type}
                      onChange={(e) => setForm((f) => ({ ...f, leave_type: e.target.value }))}
                      className="input-field"
                    >
                      {LEAVE_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">From date</label>
                    <input
                      type="date"
                      required
                      value={form.from_date}
                      onChange={(e) => setForm((f) => ({ ...f, from_date: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">To date</label>
                    <input
                      type="date"
                      required
                      value={form.to_date}
                      onChange={(e) => setForm((f) => ({ ...f, to_date: e.target.value }))}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Total days</label>
                    <input type="text" readOnly value={totalDays > 0 ? String(totalDays) : "—"} className="input-field bg-stone-50" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-stone-700">Request date</label>
                    <input type="text" readOnly value={format(new Date(), "PPP")} className="input-field bg-stone-50" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-stone-700">Reason (required)</label>
                    <textarea
                      required
                      rows={3}
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      className="input-field"
                      placeholder="Describe the reason for your leave"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-sm font-medium text-stone-700">
                      Attachment / medical certificate (optional)
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setForm((f) => ({ ...f, attachment: e.target.files?.[0] || null }))}
                      className="w-full text-sm text-stone-600"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {editRow && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        setEditRow(null);
                        resetForm();
                      }}
                    >
                      Cancel edit
                    </button>
                  )}
                  <button type="submit" disabled={submitting} className="btn-primary">
                    <FaPaperPlane className="mr-2 inline" />
                    {submitting ? "Saving…" : editRow ? "Update request" : "Submit request"}
                  </button>
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-stone-200">
              <div className="border-b border-stone-200 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-semibold text-stone-900">Leave history</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200 text-sm">
                  <thead className="bg-stone-50">
                    <tr>
                      {["Type", "From", "To", "Days", "Status", "File", "Applied", "Actions"].map((h) => (
                        <th key={h} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-stone-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-10 text-center">
                          <div className="spinner mx-auto" />
                        </td>
                      </tr>
                    ) : leaves.length ? (
                      leaves.map((row) => (
                        <tr key={row.id} className="hover:bg-stone-50">
                          <td className="whitespace-nowrap px-4 py-3 text-stone-800">
                            {LEAVE_TYPES.find((t) => t.value === row.leave_type)?.label || row.leave_type}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{row.from_date}</td>
                          <td className="whitespace-nowrap px-4 py-3">{row.to_date}</td>
                          <td className="whitespace-nowrap px-4 py-3">{row.total_days}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[row.status] || ""}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {row.attachment || row.attachment_url ? (
                              <a
                                href={`${uploadOrigin()}${row.attachment || row.attachment_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-600 hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-stone-600">
                            {row.applied_at ? format(parseISO(row.applied_at), "dd MMM yyyy") : "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {row.status === "pending" && (
                              <div className="flex gap-2">
                                <button type="button" className="text-sky-600 hover:text-sky-800" onClick={() => openEdit(row)} title="Edit">
                                  <FaEdit />
                                </button>
                                <button type="button" className="text-rose-600 hover:text-rose-800" onClick={() => cancelLeave(row.id)} title="Cancel">
                                  <FaTimesCircle />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="8" className="px-4 py-10 text-center text-stone-500">
                          No leave requests yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-stone-200">
              <h2 className="mb-3 text-lg font-semibold text-stone-900">Calendar</h2>
              <p className="mb-3 text-xs text-stone-500">Dates highlighted include approved or pending leave.</p>
              <Calendar
                className="mx-auto w-full max-w-sm rounded-xl border border-stone-200 p-2"
                tileClassName={tileClassName}
              />
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .leave-day abbr { color: #0284c7; font-weight: 600; }
      `}</style>
    </EmployeeLayout>
  );
};

export default LeaveRequest;
