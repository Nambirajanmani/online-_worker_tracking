import React from "react";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminSettings = () => (
  <AdminLayout>
    <div className="p-6">
      <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-3 text-slate-600">Company preferences, roles, and environment settings can be managed here.</p>
      </div>
    </div>
  </AdminLayout>
);

export default AdminSettings;
