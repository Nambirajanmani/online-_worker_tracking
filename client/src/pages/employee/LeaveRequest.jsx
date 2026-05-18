import React from "react";
import EmployeeLayout from "../../components/employee/EmployeeLayout";

const LeaveRequest = () => (
  <EmployeeLayout>
    <div className="p-6">
      <div className="rounded-[1.5rem] bg-white p-8 shadow-sm ring-1 ring-stone-200">
        <h1 className="text-3xl font-semibold text-stone-900">Leave Requests</h1>
        <p className="mt-3 text-stone-600">Submit leave requests and track approval progress here.</p>
      </div>
    </div>
  </EmployeeLayout>
);

export default LeaveRequest;
