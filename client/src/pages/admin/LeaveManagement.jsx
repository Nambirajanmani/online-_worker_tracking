import React, { useCallback, useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import toast from "react-hot-toast";
import { FaCheck, FaSearch, FaSync, FaTimes } from "react-icons/fa";
import { useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

const LEAVE_TYPES = [
  { value: "", label: "All types" },
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "emergency", label: "Emergency Leave" },
  { value: "paid", label: "Paid Leave" },
  { value: "unpaid", label: "Unpaid Leave" }
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" }
];

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-slate-200 text-slate-600"
};

const uploadOrigin = () => (process.env.REACT_APP_API_URL || "").replace(/\/api\/?$/, "") || "";

const LeaveManagement = () => {
  const { token } = useSelector((state) => state.auth);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({
    total_requests: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    on_leave_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [actionRow, setActionRow] = useState(null);
  const [actionType, setActionType] = useState("approved");
  const [adminRemark, setAdminRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (leaveType) params.leaveType = leaveType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (appliedFrom) params.appliedFrom = appliedFrom;
      if (appliedTo) params.appliedTo = appliedTo;

      const [listRes, statsRes] = await Promise.all([
        api.get("/admin/leaves", { params }),
        api.get("/admin/leaves/stats")
      ]);
      setRows(Array.isArray(listRes.data?.data) ? listRes.data.data : []);
      setStats({
        total_requests: 0,
        approved: 0,
        pending: 0,
        rejected: 0,
        on_leave_today: 0,
        ...statsRes.data?.data
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  }, [search, status, leaveType, dateFrom, dateTo, appliedFrom, appliedTo]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(fetchAll, 250);
    return () => clearTimeout(t);
  }, [fetchAll]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = connectSocket(token);
    const onLeave = () => {
      fetchAll();
    };
    socket.on("leave:created", onLeave);
    socket.on("leave:updated", onLeave);
    return () => {
      socket.off("leave:created", onLeave);
      socket.off("leave:updated", onLeave);
    };
  }, [token, fetchAll]);

  const submitAction = async () => {
    if (!actionRow) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/leaves/${actionRow.id}`, {
        status: actionType,
        admin_remark: adminRemark.trim() || null
      });
      toast.success(`Leave ${actionType}`);
      setActionRow(null);
      setAdminRemark("");
      await fetchAll();
    } catch (error) {
      toast.error(error.response?.data?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (row, type) => {
    setActionRow(row);
    setActionType(type);
    setAdminRemark(row.admin_remark || "");
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Leave management</h1>
            <p className="mt-1 text-slate-600">Review requests, approve or reject, and monitor team availability.</p>
          </div>
          <button type="button" className="btn-secondary self-start" onClick={fetchAll}>
            <FaSync className="mr-2" /> Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Total", stats.total_requests],
            ["Approved", stats.approved],
            ["Pending", stats.pending],
            ["Rejected", stats.rejected],
            ["On leave today", stats.on_leave_today]
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{value ?? 0}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:grid-cols-3 xl:grid-cols-6">
          <div className="relative lg:col-span-2">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or employee ID"
              className="input-field pl-10"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Leave type</label>
            <select value={leaveType} onChange={(e) => setLeaveType(e.target.value)} className="input-field">
              {LEAVE_TYPES.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Leave from (min)</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Leave to (max)</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Applied from</label>
            <input type="date" value={appliedFrom} onChange={(e) => setAppliedFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Applied to</label>
            <input type="date" value={appliedTo} onChange={(e) => setAppliedTo(e.target.value)} className="input-field" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200 xl:col-span-3">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6">
              <h2 className="text-lg font-semibold text-slate-900">All requests</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[900px] divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Employee",
                      "ID",
                      "Type",
                      "From",
                      "To",
                      "Days",
                      "Reason",
                      "File",
                      "Status",
                      "Applied",
                      "Actions"
                    ].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="px-4 py-12 text-center">
                        <div className="spinner mx-auto" />
                      </td>
                    </tr>
                  ) : rows.length ? (
                    rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="max-w-[140px] truncate px-3 py-3 font-medium text-slate-900">{row.employee_name}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">{row.employee_code}</td>
                        <td className="whitespace-nowrap px-3 py-3">{LEAVE_TYPES.find((t) => t.value === row.leave_type)?.label || row.leave_type}</td>
                        <td className="whitespace-nowrap px-3 py-3">{row.from_date}</td>
                        <td className="whitespace-nowrap px-3 py-3">{row.to_date}</td>
                        <td className="whitespace-nowrap px-3 py-3">{row.total_days}</td>
                        <td className="max-w-[180px] truncate px-3 py-3 text-slate-600" title={row.reason}>
                          {row.reason}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
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
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[row.status] || ""}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                          {row.applied_at ? format(parseISO(row.applied_at), "dd MMM yyyy HH:mm") : "—"}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          {row.status === "pending" && (
                            <div className="flex gap-2">
                              <button type="button" className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700" onClick={() => openAction(row, "approved")}>
                                <FaCheck className="inline" /> Approve
                              </button>
                              <button type="button" className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700" onClick={() => openAction(row, "rejected")}>
                                <FaTimes className="inline" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="11" className="px-4 py-12 text-center text-slate-500">
                        No leave requests match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-2 text-lg font-semibold text-slate-900">Calendar</h2>
            <p className="mb-2 text-xs text-slate-500">Team leave (pending + approved)</p>
            <Calendar className="w-full rounded-xl border border-slate-200 p-2" />
          </div>
        </div>

        {actionRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900">
                {actionType === "approved" ? "Approve leave" : "Reject leave"}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                {actionRow.employee_name} · {actionRow.from_date} → {actionRow.to_date}
              </p>
              <label className="mt-4 block text-sm font-medium text-slate-700">Admin remark (optional)</label>
              <textarea
                rows={3}
                value={adminRemark}
                onChange={(e) => setAdminRemark(e.target.value)}
                className="input-field mt-1"
                placeholder="Notes visible to reporting / payroll"
              />
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" className="btn-secondary" onClick={() => setActionRow(null)} disabled={submitting}>
                  Close
                </button>
                <button type="button" className="btn-primary" onClick={submitAction} disabled={submitting}>
                  {submitting ? "Saving…" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default LeaveManagement;
