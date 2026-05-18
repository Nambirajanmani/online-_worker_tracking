import React from "react";
import AdminLayout from "../../components/admin/AdminLayout";

const LeaveManagement = () => (
  <AdminLayout>
    <div className="p-6">
      <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900">Leave Management</h1>
        <p className="mt-3 text-slate-600">Review and approve employee leave requests from this workspace.</p>
      </div>
    </div>
  </AdminLayout>
);

export default LeaveManagement;
