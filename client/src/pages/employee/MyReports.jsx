import React from "react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

const MyReports = () => (
  <EmployeeLayout>
    <div className="p-6">
      <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-3xl font-semibold text-stone-900">My Reports</h1>
        <p className="mt-3 text-stone-600">Access personal productivity, attendance, and performance reports here.</p>
      </div>
    </div>
  </EmployeeLayout>
);

export default MyReports;
