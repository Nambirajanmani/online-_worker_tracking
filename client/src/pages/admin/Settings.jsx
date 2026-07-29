import React, { useState } from "react";
import { FaBuilding, FaUserShield, FaBell, FaLock, FaSave, FaTimes, FaPlus, FaCheck } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";

/* ───────── Permission definitions ───────── */
const PERMISSIONS = [
  { id: "view_dashboard",     label: "View Dashboard" },
  { id: "manage_employees",   label: "Manage Employees" },
  { id: "manage_tasks",       label: "Manage Tasks" },
  { id: "view_reports",       label: "View Reports" },
  { id: "manage_leaves",      label: "Manage Leaves" },
  { id: "manage_attendance",  label: "Manage Attendance" },
  { id: "manage_roles",       label: "Manage Roles" },
  { id: "manage_settings",    label: "Manage Settings" },
];

/* ───────── Default roles ───────── */
const DEFAULT_ROLES = [
  {
    id: 1,
    name: "Administrator",
    description: "Full access to all system features",
    permissions: PERMISSIONS.map((p) => p.id),
    isDefault: true,
  },
  {
    id: 2,
    name: "Manager",
    description: "Can manage team and approve requests",
    permissions: ["view_dashboard", "manage_tasks", "view_reports", "manage_leaves", "manage_attendance"],
    isDefault: true,
  },
  {
    id: 3,
    name: "Employee",
    description: "Standard access to personal dashboard",
    permissions: ["view_dashboard"],
    isDefault: true,
  },
];

/* ───────── Role Modal ───────── */
const RoleModal = ({ role, onClose, onSave }) => {
  const [name, setName]               = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [selectedPerms, setSelectedPerms] = useState(new Set(role?.permissions || []));

  const togglePerm = (id) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ ...role, name: name.trim(), description: description.trim(), permissions: [...selectedPerms] });
    onClose();
  };

  const isEdit = !!role?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {isEdit ? `Edit Role: ${role.name}` : "Create Custom Role"}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {isEdit ? "Modify role details and permissions." : "Define a new role with specific permissions."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FaTimes size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Team Lead"
              disabled={isEdit && role?.isDefault}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-50 disabled:text-slate-400"
            />
            {isEdit && role?.isDefault && (
              <p className="text-xs text-amber-500 mt-1">Default role names cannot be changed.</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this role"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Permissions
              <span className="ml-2 text-xs text-slate-400 font-normal">({selectedPerms.size} selected)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSIONS.map((perm) => {
                const checked = selectedPerms.has(perm.id);
                return (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => togglePerm(perm.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                      checked
                        ? "bg-sky-50 border-sky-300 text-sky-700"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all ${
                        checked ? "bg-sky-500 border-sky-500" : "border-slate-300 bg-white"
                      }`}
                    >
                      {checked && <FaCheck size={8} color="white" />}
                    </span>
                    {perm.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-xl hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FaSave size={12} />
            {isEdit ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ───────── Main Settings Page ───────── */
const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("company");
  const [roles, setRoles]         = useState(DEFAULT_ROLES);
  const [modalRole, setModalRole] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [savedMsg, setSavedMsg]   = useState(false);

  const tabs = [
    { id: "company",       label: "Company Profile",    icon: FaBuilding },
    { id: "roles",         label: "Roles & Permissions", icon: FaUserShield },
    { id: "notifications", label: "Notifications",       icon: FaBell },
    { id: "security",      label: "Security",            icon: FaLock },
  ];

  const openEdit   = (role) => { setModalRole(role); setShowModal(true); };
  const openCreate = ()     => { setModalRole(null); setShowModal(true); };

  const handleSaveRole = (updatedRole) => {
    if (updatedRole.id) {
      setRoles((prev) => prev.map((r) => (r.id === updatedRole.id ? updatedRole : r)));
    } else {
      setRoles((prev) => [...prev, { ...updatedRole, id: Date.now(), isDefault: false }]);
    }
  };

  const handleDeleteRole = (id) => setRoles((prev) => prev.filter((r) => r.id !== id));

  const handleSaveChanges = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <AdminLayout>
      {showModal && (
        <RoleModal
          role={modalRole}
          onClose={() => setShowModal(false)}
          onSave={handleSaveRole}
        />
      )}

      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Settings</h1>
          <p className="mt-2 text-slate-500">Manage your company preferences, security, and environment configurations.</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="flex flex-col gap-1 sticky top-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={isActive ? "text-sky-500" : "text-slate-400"} size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            <div className="rounded-[1.5rem] bg-white p-6 sm:p-8 shadow-sm ring-1 ring-slate-200 min-h-[500px]">

              {/* Company Profile Tab */}
              {activeTab === "company" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">Company Profile</h2>
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center gap-6">
                      <div className="h-24 w-24 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                        <span className="text-xs font-medium text-slate-500">Upload Logo</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-slate-900">Company Logo</h3>
                        <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB. 256x256px recommended.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Company Name</label>
                        <input type="text" className="input-field" defaultValue="TechCorp Solutions" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Support Email</label>
                        <input type="email" className="input-field" defaultValue="support@techcorp.com" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Timezone</label>
                        <select className="input-field">
                          <option>UTC (Coordinated Universal Time)</option>
                          <option>EST (Eastern Standard Time)</option>
                          <option>PST (Pacific Standard Time)</option>
                          <option>IST (Indian Standard Time)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Date Format</label>
                        <select className="input-field">
                          <option>MM/DD/YYYY</option>
                          <option>DD/MM/YYYY</option>
                          <option>YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Roles & Permissions Tab */}
              {activeTab === "roles" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">Roles & Permissions</h2>
                  <div className="space-y-3">
                    {roles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/60 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{role.name}</p>
                            {!role.isDefault && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Custom</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-0.5">{role.description}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                          <button
                            onClick={() => openEdit(role)}
                            className="text-sm font-medium text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                          >
                            Edit
                          </button>
                          {!role.isDefault && (
                            <button
                              onClick={() => handleDeleteRole(role.id)}
                              className="text-sm font-medium text-red-500 hover:text-red-600 hover:underline transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={openCreate}
                      className="mt-2 flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700 px-3 py-2 rounded-xl hover:bg-sky-50 transition-colors"
                    >
                      <FaPlus size={11} />
                      Create Custom Role
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === "notifications" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">Notification Preferences</h2>
                  <div className="space-y-6 max-w-2xl">
                    {[
                      { title: "Email Notifications", desc: "Receive emails when a new task is assigned.", defaultChecked: true },
                      { title: "Leave Approvals",      desc: "Notify managers immediately upon leave request.", defaultChecked: true },
                      { title: "Daily Summary",        desc: "Send a daily summary email of team attendance.", defaultChecked: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{item.title}</p>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">Security Settings</h2>
                  <div className="space-y-6 max-w-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">Two-Factor Authentication (2FA)</p>
                        <p className="text-sm text-slate-500">Require all admins to use 2FA.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>
                    <div className="pt-4 border-t border-slate-100">
                      <p className="font-medium text-slate-900 mb-2">Password Policy</p>
                      <select className="input-field max-w-xs">
                        <option>Standard (8 chars, 1 number)</option>
                        <option>Strict (10 chars, upper, lower, number, special)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                {savedMsg && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
                    <FaCheck size={11} /> Changes saved!
                  </span>
                )}
                <button onClick={handleSaveChanges} className="btn-primary flex items-center gap-2">
                  <FaSave /> Save Changes
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
