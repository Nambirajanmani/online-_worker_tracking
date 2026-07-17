import React, { useEffect, useState } from "react";
import { FaEdit, FaEye, FaFilter, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee,
  toggleEmployeeStatus
} from "../../store/slices/employeeSlice";
import { fetchTaskStats as fetchStats } from "../../store/slices/taskSlice";

const emptyForm = {
  employeeCode: "",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  department: "",
  position: "",
  phone: "",
  joiningDate: "",
  endDate: "",
  salary: ""
};

const Employees = () => {
  const dispatch = useDispatch();
  const { employees, loading } = useSelector((state) => state.employees);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  const filteredEmployees = employees.filter((employee) =>
    `${employee.first_name || ""} ${employee.last_name || ""} ${employee.email || ""} ${employee.department || ""} ${employee.employee_code || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const validateForm = () => {
    const errors = {};
    if (!formData.employeeCode.trim()) errors.employeeCode = "Employee ID is required";
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.firstName)) errors.firstName = "Only letters and spaces allowed";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    else if (!/^[a-zA-Z\s]+$/.test(formData.lastName)) errors.lastName = "Only letters and spaces allowed";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Enter a valid email address";
    if (!editingEmployee && !formData.password) errors.password = "Password is required";
    if (formData.phone && formData.phone.length !== 10) errors.phone = "Phone number must be exactly 10 digits";
    if (formData.salary && !/^\d+$/.test(formData.salary)) errors.salary = "Salary must be a whole number";
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const action = editingEmployee
      ? updateEmployee({ id: editingEmployee.id, data: formData })
      : createEmployee(formData);

    const result = await dispatch(action);
    if (!result.type.endsWith("/rejected")) {
      setShowModal(false);
      setEditingEmployee(null);
      setFormData(emptyForm);
      setFormErrors({});
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employeeCode: employee.employee_code || "",
      firstName: employee.first_name || "",
      lastName: employee.last_name || "",
      email: employee.email || "",
      password: "",
      department: employee.department || "",
      position: employee.position || "",
      phone: employee.phone || "",
      joiningDate: employee.joining_date?.split("T")[0] || "",
      endDate: employee.end_date?.split("T")[0] || "",
      salary: employee.salary ? String(parseInt(employee.salary, 10)) : ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      await dispatch(deleteEmployee(id));
    }
  };

  const handleToggleStatus = async (employee) => {
    const action = employee.is_active ? "deactivate" : "activate";
    const confirmed = window.confirm(`Are you sure you want to ${action} this employee?`);

    if (confirmed) {
      const result = await dispatch(toggleEmployeeStatus(employee));
      if (!result.type.endsWith("/rejected")) {
        dispatch(fetchStats());
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Employees</h1>
            <p className="mt-1 text-slate-600">Manage employee records, onboarding details, and status.</p>
          </div>
          <button type="button" className="btn-primary inline-flex items-center" onClick={() => setShowModal(true)}>
            <FaPlus className="mr-2" /> Add Employee
          </button>
        </div>

        <div className="mb-6 rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, or employee ID"
                className="input-field pl-11"
              />
            </div>
            <button type="button" className="btn-secondary inline-flex items-center justify-center">
              <FaFilter className="mr-2" /> Filter
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {["Employee", "Employee ID", "Department", "Position", "Email", "Status", "Actions"].map((heading) => (
                    <th
                      key={heading}
                      className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.15em] text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center">
                      <div className="spinner mx-auto" />
                    </td>
                  </tr>
                ) : filteredEmployees.length ? (
                  filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 font-semibold text-white">
                            {employee.first_name?.[0]}
                            {employee.last_name?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {employee.first_name} {employee.last_name}
                            </p>
                            <p className="text-sm text-slate-500">{employee.employee_code || "No code"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.employee_code || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.department || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.position || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.email}</td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(employee)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold transition-colors hover:opacity-80 ${
                            employee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button type="button" title="View" className="text-emerald-600 hover:text-emerald-700" onClick={() => setViewingEmployee(employee)}>
                            <FaEye />
                          </button>
                          <button type="button" title="Edit" className="text-sky-600 hover:text-sky-700" onClick={() => handleEdit(employee)}>
                            <FaEdit />
                          </button>
                          <button type="button" title="Delete" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(employee.id)}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-3xl rounded-[1.5rem] bg-white p-6 shadow-2xl">
              <h2 className="text-2xl font-semibold text-slate-900">
                {editingEmployee ? "Edit employee" : "Add employee"}
              </h2>
              <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ["Employee ID", "employeeCode", "text"],
                    ["First Name", "firstName", "text"],
                    ["Last Name", "lastName", "text"],
                    ["Email", "email", "email"],
                    [editingEmployee ? "Password (optional)" : "Password", "password", "password"],
                    ["Position", "position", "text"],
                    ["Phone", "phone", "tel"],
                    ["Joining Date", "joiningDate", "date"],
                    ["End Date", "endDate", "date"],
                    ["Salary", "salary", "number"]
                  ].map(([label, field, type]) => (
                    <div key={field}>
                      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                      <input
                        type={field === "salary" ? "text" : type}
                        value={formData[field]}
                        onChange={(event) => {
                          let value = event.target.value;
                          if (field === "firstName" || field === "lastName") {
                            value = value.replace(/[^a-zA-Z\s]/g, "");
                          }
                          if (field === "phone") {
                            value = value.replace(/[^0-9]/g, "").slice(0, 10);
                          }
                          if (field === "salary") {
                            value = value.replace(/[^0-9]/g, "");
                          }
                          setFormData((current) => ({ ...current, [field]: value }));
                          if (formErrors[field]) {
                            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
                          }
                        }}
                        placeholder={field === "phone" ? "10-digit number" : ""}
                        maxLength={field === "phone" ? 10 : undefined}
                        className={`input-field ${
                          formErrors[field] ? "!border-rose-400 !ring-rose-200 focus:!border-rose-500 focus:!ring-rose-300" : ""
                        }`}
                      />
                      {formErrors[field] && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-rose-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {formErrors[field]}
                        </p>
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
                    <select
                      value={formData.department}
                      onChange={(event) =>
                        setFormData((current) => ({ ...current, department: event.target.value }))
                      }
                      className="input-field"
                    >
                      <option value="">Select department</option>
                      <option value="Management">Management</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                      <option value="Sales">Sales</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingEmployee ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {viewingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-slate-900">Employee Details</h2>
                <button type="button" className="text-slate-400 hover:text-slate-600 text-xl" onClick={() => setViewingEmployee(null)}>&times;</button>
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-600 text-xl font-semibold text-white">
                  {viewingEmployee.first_name?.[0]}{viewingEmployee.last_name?.[0]}
                </div>
                <div>
                  <p className="text-xl font-semibold text-slate-900">{viewingEmployee.first_name} {viewingEmployee.last_name}</p>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${viewingEmployee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                    {viewingEmployee.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Employee ID", viewingEmployee.employee_code || "N/A"],
                  ["Department", viewingEmployee.department || "N/A"],
                  ["Position", viewingEmployee.position || "N/A"],
                  ["Email", viewingEmployee.email || "N/A"],
                  ["Phone", viewingEmployee.phone || "N/A"],
                  ["Joining Date", viewingEmployee.joining_date ? new Date(viewingEmployee.joining_date).toLocaleDateString() : "N/A"],
                  ["End Date", viewingEmployee.end_date ? new Date(viewingEmployee.end_date).toLocaleDateString() : "N/A"],
                  ["Salary", viewingEmployee.salary ? `₹${Number(viewingEmployee.salary).toLocaleString()}` : "N/A"]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
                    <p className="text-sm font-medium text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6">
                <button type="button" className="btn-secondary" onClick={() => setViewingEmployee(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Employees;