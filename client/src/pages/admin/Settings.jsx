import React, { useState } from "react";
import { FaBuilding, FaUserShield, FaBell, FaLock, FaSave } from "react-icons/fa";
import AdminLayout from "../../components/admin/AdminLayout";

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("company");

  const tabs = [
    { id: "company", label: "Company Profile", icon: FaBuilding },
    { id: "roles", label: "Roles & Permissions", icon: FaUserShield },
    { id: "notifications", label: "Notifications", icon: FaBell },
    { id: "security", label: "Security", icon: FaLock }
  ];

  return (
    <AdminLayout>
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

              {/* Roles Tab */}
              {activeTab === "roles" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-4">Roles & Permissions</h2>
                  <div className="space-y-4">
                    {["Administrator", "Manager", "Employee"].map((role, idx) => (
                      <div key={role} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/50 transition-colors cursor-pointer">
                        <div>
                          <p className="font-medium text-slate-900">{role}</p>
                          <p className="text-sm text-slate-500">{idx === 0 ? "Full access to all system features" : idx === 1 ? "Can manage team and approve requests" : "Standard access to personal dashboard"}</p>
                        </div>
                        <button className="text-sm font-medium text-sky-600 hover:text-sky-700">Edit</button>
                      </div>
                    ))}
                    <button className="mt-4 text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-2">
                      + Create Custom Role
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
                      { title: "Leave Approvals", desc: "Notify managers immediately upon leave request.", defaultChecked: true },
                      { title: "Daily Summary", desc: "Send a daily summary email of team attendance.", defaultChecked: false }
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

              {/* Save Button (Common) */}
              <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                <button className="btn-primary flex items-center gap-2">
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
