import React, { useEffect, useState } from "react";
import { FaEdit, FaFilter, FaPlus, FaSearch, FaTrash } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import AdminLayout from "../../components/admin/AdminLayout";
import {
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  updateEmployee
} from "../../store/slices/employeeSlice";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  department: "",
  position: "",
  phone: "",
  joiningDate: "",
  salary: ""
};

const Employees = () => {
  const dispatch = useDispatch();
  const { employees, loading } = useSelector((state) => state.employees);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  const filteredEmployees = employees.filter((employee) =>
    `${employee.first_name || ""} ${employee.last_name || ""} ${employee.email || ""} ${employee.department || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const action = editingEmployee
      ? updateEmployee({ id: editingEmployee.id, data: formData })
      : createEmployee(formData);

    const result = await dispatch(action);
    if (!result.type.endsWith("/rejected")) {
      setShowModal(false);
      setEditingEmployee(null);
      setFormData(emptyForm);
    }
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      firstName: employee.first_name || "",
      lastName: employee.last_name || "",
      email: employee.email || "",
      password: "",
      department: employee.department || "",
      position: employee.position || "",
      phone: employee.phone || "",
      joiningDate: employee.joining_date?.split("T")[0] || "",
      salary: employee.salary || ""
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      await dispatch(deleteEmployee(id));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEmployee(null);
    setFormData(emptyForm);
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
                placeholder="Search by name, email, or department"
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
                  {["Employee", "Department", "Position", "Email", "Status", "Actions"].map((heading) => (
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
                    <td colSpan="6" className="px-6 py-10 text-center">
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
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.department || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.position || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{employee.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            employee.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {employee.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button type="button" className="text-sky-600 hover:text-sky-700" onClick={() => handleEdit(employee)}>
                            <FaEdit />
                          </button>
                          <button type="button" className="text-rose-600 hover:text-rose-700" onClick={() => handleDelete(employee.id)}>
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
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
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {[
                    ["First Name", "firstName", "text"],
                    ["Last Name", "lastName", "text"],
                    ["Email", "email", "email"],
                    [editingEmployee ? "Password (optional)" : "Password", "password", "password"],
                    ["Position", "position", "text"],
                    ["Phone", "phone", "tel"],
                    ["Joining Date", "joiningDate", "date"],
                    ["Salary", "salary", "number"]
                  ].map(([label, field, type]) => (
                    <div key={field}>
                      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
                      <input
                        type={type}
                        required={field !== "password" ? ["firstName", "lastName", "email"].includes(field) : !editingEmployee}
                        value={formData[field]}
                        onChange={(event) =>
                          setFormData((current) => ({ ...current, [field]: event.target.value }))
                        }
                        className="input-field"
                      />
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
      </div>
    </AdminLayout>
  );
};

export default Employees;
