import React from "react";
import AdminLayout from "../../components/admin/AdminLayout";

const Tracking = () => (
  <AdminLayout>
    <div className="p-6">
      <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900">AttendanceTracking</h1>
        <p className="mt-3 text-slate-600">
          This page is ready for live activity, screenshots, and attendance tracking integrations.
        </p>
      </div>
    </div>
  </AdminLayout>
);

export default Tracking;
