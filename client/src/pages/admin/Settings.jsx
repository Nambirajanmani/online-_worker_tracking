import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  Building2,
  Clock,
  Shield,
  Calendar,
  Activity,
  Bell,
  Lock,
  Plug,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  Copy,
  CheckCircle2,
  Download,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";
import AdminLayout from "../../components/admin/AdminLayout";
import { api } from "../../lib/api";

const initialSettingsState = {
  general: {
    companyName: "Acme Workforce Corp",
    companyLogo: "",
    companyEmail: "admin@example.com",
    timezone: "UTC+05:30 (Asia/Kolkata)",
    dateFormat: "YYYY-MM-DD",
    timeFormat: "12-hour (hh:mm A)",
    workWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    holidays: [
      { id: "1", name: "New Year's Day", date: "2026-01-01" },
      { id: "2", name: "Independence Day", date: "2026-08-15" },
      { id: "3", name: "Labor Day", date: "2026-05-01" }
    ]
  },
  attendance: {
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    gracePeriodMinutes: 15,
    minHoursFullDay: 8,
    minHoursHalfDay: 4,
    autoClockOutTime: "21:00",
    enableAutoClockOut: true,
    enableOvertime: true,
    overtimeRate: 1.5,
    requireOvertimeApproval: true
  },
  roles: {
    rolesList: ["Admin", "Manager", "Employee", "HR Specialist", "Team Lead"],
    permissions: {
      viewReports: ["Admin", "Manager"],
      approveLeaves: ["Admin", "Manager"],
      editEmployees: ["Admin", "HR Specialist"],
      assignTasks: ["Admin", "Manager", "Team Lead"],
      viewLiveMonitoring: ["Admin", "Manager"],
      manageSettings: ["Admin"],
      exportData: ["Admin"]
    },
    teamManagers: [
      { team: "Engineering", manager: "System Administrator" },
      { team: "Sales & Marketing", manager: "System Administrator" },
      { team: "Operations", manager: "System Administrator" }
    ]
  },
  leave: {
    leaveTypes: [
      { id: "casual", name: "Casual Leave", quota: 12, carryForward: true, maxCarry: 5 },
      { id: "sick", name: "Sick Leave", quota: 10, carryForward: false, maxCarry: 0 },
      { id: "paid", name: "Paid Vacation", quota: 15, carryForward: true, maxCarry: 10 },
      { id: "unpaid", name: "Unpaid Leave", quota: 30, carryForward: false, maxCarry: 0 },
      { id: "emergency", name: "Emergency Leave", quota: 5, carryForward: false, maxCarry: 0 }
    ],
    workflow: "manager_then_admin",
    requireAttachmentDays: 3
  },
  monitoring: {
    screenActivityTracking: true,
    idleThresholdMinutes: 5,
    screenshotCapture: true,
    screenshotIntervalMinutes: 10,
    blurScreenshots: false,
    trackAppsAndWebsites: true,
    workingHoursOnly: true,
    productivityRules: [
      { name: "Visual Studio Code", type: "app", category: "Productive" },
      { name: "GitHub", type: "website", category: "Productive" },
      { name: "Slack", type: "app", category: "Productive" },
      { name: "YouTube", type: "website", category: "Unproductive" },
      { name: "Netflix", type: "website", category: "Unproductive" },
      { name: "Google Search", type: "website", category: "Neutral" }
    ],
    dailyProductivityTarget: 80,
    employeeConsentNotice:
      "Notice: Screen activity, idle times, and application usage are monitored during official working hours to ensure productivity and workplace safety.",
    dataRetentionDays: 30,
    visibility: {
      employeeCanViewScreenshots: false,
      employeeCanViewProductivityScore: true,
      employeeCanViewTimeline: true
    }
  },
  notifications: {
    emailAlerts: true,
    inAppAlerts: true,
    alertOnLateArrival: true,
    alertOnLongIdle: true,
    alertOnLeaveRequest: true,
    alertOnTaskOverdue: true,
    adminDailySummary: true,
    adminWeeklySummary: true,
    summaryDeliveryTime: "18:30"
  },
  security: {
    minPasswordLength: 8,
    requireSpecialChar: true,
    requireNumber: true,
    sessionTimeoutMinutes: 60,
    twoFactorAuth: false,
    ipAllowlistEnabled: false,
    allowedIps: ["127.0.0.1", "192.168.1.1"]
  },
  integrations: {
    webhookUrl: "https://api.example.com/webhooks/tracking",
    apiKey: "agy_live_9f82a17cb20e4e2a7b83",
    slackWebhookUrl: "",
    teamsWebhookUrl: "",
    autoBackupDaily: true
  }
};

const navigationTabs = [
  { id: "general", label: "General", icon: Building2, desc: "Company profile, timezone & calendar" },
  { id: "attendance", label: "Attendance & Hours", icon: Clock, desc: "Work schedules, grace periods & overtime" },
  { id: "roles", label: "Roles & Permissions", icon: Shield, desc: "Role matrix & team assignments" },
  { id: "leave", label: "Leave Policy", icon: Calendar, desc: "Leave quotas, types & approval workflow" },
  { id: "monitoring", label: "Monitoring & Privacy", icon: Activity, desc: "Screen tracking, idle times & privacy" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alert rules & admin summary delivery" },
  { id: "security", label: "Security & Audit", icon: Lock, desc: "Password policy, 2FA & audit logs" },
  { id: "integrations", label: "Integrations & Data", icon: Plug, desc: "Webhooks, API keys & data exports" }
];

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const AdminSettings = () => {
  const { token } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(initialSettingsState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);

  // New item inputs
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });
  const [newRole, setNewRole] = useState("");
  const [newLeaveType, setNewLeaveType] = useState({ name: "", quota: 10, carryForward: false, maxCarry: 0 });
  const [newRule, setNewRule] = useState({ name: "", type: "app", category: "Productive" });
  const [newIp, setNewIp] = useState("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get("/admin/settings", { headers });
      if (res.data?.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (error) {
      console.warn("Could not fetch remote settings, using local defaults:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await api.get("/admin/settings/audit-logs", { headers });
      if (res.data?.data) {
        setAuditLogs(res.data.data);
      }
    } catch (error) {
      console.warn("Could not fetch audit logs:", error.message);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [token]);

  useEffect(() => {
    if (activeTab === "security") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const updateSection = (category, field, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleSave = async (category = activeTab) => {
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await api.put(`/admin/settings/${category}`, settings[category], { headers });
      toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save settings to server.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (category = activeTab) => {
    if (!window.confirm(`Reset ${category} settings to original defaults?`)) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await api.post("/admin/settings/reset", { category }, { headers });
      setSettings((prev) => ({
        ...prev,
        [category]: initialSettingsState[category]
      }));
      toast.success(`Reset ${category} settings to defaults.`);
    } catch (error) {
      setSettings((prev) => ({
        ...prev,
        [category]: initialSettingsState[category]
      }));
      toast.success(`Local ${category} settings reset to defaults.`);
    }
  };

  // Holiday management
  const addHoliday = () => {
    if (!newHoliday.name || !newHoliday.date) {
      toast.error("Please enter holiday name and date.");
      return;
    }
    const updated = [
      ...(settings.general.holidays || []),
      { id: Date.now().toString(), name: newHoliday.name, date: newHoliday.date }
    ];
    updateSection("general", "holidays", updated);
    setNewHoliday({ name: "", date: "" });
  };

  const removeHoliday = (id) => {
    const updated = settings.general.holidays.filter((h) => h.id !== id);
    updateSection("general", "holidays", updated);
  };

  // Role management
  const addCustomRole = () => {
    if (!newRole.trim()) return;
    if (settings.roles.rolesList.includes(newRole.trim())) {
      toast.error("Role already exists.");
      return;
    }
    const updated = [...settings.roles.rolesList, newRole.trim()];
    updateSection("roles", "rolesList", updated);
    setNewRole("");
  };

  const removeRole = (role) => {
    if (["Admin", "Manager", "Employee"].includes(role)) {
      toast.error("Cannot delete default system roles.");
      return;
    }
    const updated = settings.roles.rolesList.filter((r) => r !== role);
    updateSection("roles", "rolesList", updated);
  };

  const togglePermission = (permKey, roleName) => {
    const current = settings.roles.permissions[permKey] || [];
    const updated = current.includes(roleName)
      ? current.filter((r) => r !== roleName)
      : [...current, roleName];

    setSettings((prev) => ({
      ...prev,
      roles: {
        ...prev.roles,
        permissions: {
          ...prev.roles.permissions,
          [permKey]: updated
        }
      }
    }));
  };

  // Leave types management
  const addLeaveType = () => {
    if (!newLeaveType.name.trim()) return;
    const id = newLeaveType.name.toLowerCase().replace(/\s+/g, "_");
    const updated = [
      ...settings.leave.leaveTypes,
      { ...newLeaveType, id, quota: Number(newLeaveType.quota) || 10 }
    ];
    updateSection("leave", "leaveTypes", updated);
    setNewLeaveType({ name: "", quota: 10, carryForward: false, maxCarry: 0 });
  };

  const removeLeaveType = (id) => {
    const updated = settings.leave.leaveTypes.filter((l) => l.id !== id);
    updateSection("leave", "leaveTypes", updated);
  };

  // Productivity rules
  const addProductivityRule = () => {
    if (!newRule.name.trim()) return;
    const updated = [...settings.monitoring.productivityRules, newRule];
    updateSection("monitoring", "productivityRules", updated);
    setNewRule({ name: "", type: "app", category: "Productive" });
  };

  const removeProductivityRule = (index) => {
    const updated = settings.monitoring.productivityRules.filter((_, i) => i !== index);
    updateSection("monitoring", "productivityRules", updated);
  };

  // IP Allowlist
  const addIp = () => {
    if (!newIp.trim()) return;
    const updated = [...(settings.security.allowedIps || []), newIp.trim()];
    updateSection("security", "allowedIps", updated);
    setNewIp("");
  };

  const removeIp = (ip) => {
    const updated = settings.security.allowedIps.filter((item) => item !== ip);
    updateSection("security", "allowedIps", updated);
  };

  // Export helpers
  const handleExportData = (type) => {
    toast.success(`Exporting ${type} data in CSV format...`);
    const dummyCsv = `id,name,timestamp\n1,Demo Entry,${new Date().toISOString()}`;
    const blob = new Blob([dummyCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="spinner" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-800">
                System Administration
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Configure company profile, work rules, employee permissions, monitoring, and compliance policies.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleReset()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4 text-slate-500" />
              Reset Tab
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Layout: Sidebar Submenu + Tab Content */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Submenu Tabs */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-slate-400">Settings Menu</p>
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                      isActive
                        ? "bg-sky-50 text-sky-900 ring-1 ring-sky-200"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`mt-0.5 rounded-lg p-2 ${
                        isActive ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{tab.label}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{tab.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Tab Panels */}
          <div className="lg:col-span-3 space-y-6">
            {/* 1. GENERAL TAB */}
            {activeTab === "general" && (
              <div className="space-y-6">
                {/* Company Info */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Company Profile</h2>
                  <p className="text-sm text-slate-500">General business identity and localized formats.</p>

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Company Name</label>
                      <input
                        type="text"
                        value={settings.general.companyName}
                        onChange={(e) => updateSection("general", "companyName", e.target.value)}
                        className="input-field mt-1.5"
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Admin Email</label>
                      <input
                        type="email"
                        value={settings.general.companyEmail}
                        onChange={(e) => updateSection("general", "companyEmail", e.target.value)}
                        className="input-field mt-1.5"
                        placeholder="admin@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Company Logo URL</label>
                      <input
                        type="text"
                        value={settings.general.companyLogo}
                        onChange={(e) => updateSection("general", "companyLogo", e.target.value)}
                        className="input-field mt-1.5"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Timezone</label>
                      <select
                        value={settings.general.timezone}
                        onChange={(e) => updateSection("general", "timezone", e.target.value)}
                        className="input-field mt-1.5"
                      >
                        <option value="UTC+05:30 (Asia/Kolkata)">UTC+05:30 (Asia/Kolkata)</option>
                        <option value="UTC+00:00 (GMT/London)">UTC+00:00 (GMT / London)</option>
                        <option value="UTC-05:00 (America/New_York - EST)">UTC-05:00 (America/New_York - EST)</option>
                        <option value="UTC-08:00 (America/Los_Angeles - PST)">UTC-08:00 (America/Los_Angeles - PST)</option>
                        <option value="UTC+01:00 (Europe/Paris - CET)">UTC+01:00 (Europe/Paris - CET)</option>
                        <option value="UTC+08:00 (Asia/Singapore)">UTC+08:00 (Asia/Singapore)</option>
                        <option value="UTC+04:00 (Asia/Dubai)">UTC+04:00 (Asia/Dubai)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Date Format</label>
                      <select
                        value={settings.general.dateFormat}
                        onChange={(e) => updateSection("general", "dateFormat", e.target.value)}
                        className="input-field mt-1.5"
                      >
                        <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-14)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (14/11/2026)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (11/14/2026)</option>
                        <option value="MMMM do, yyyy">Full Date (November 14th, 2026)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Time Format</label>
                      <select
                        value={settings.general.timeFormat}
                        onChange={(e) => updateSection("general", "timeFormat", e.target.value)}
                        className="input-field mt-1.5"
                      >
                        <option value="12-hour (hh:mm A)">12-hour (09:00 AM)</option>
                        <option value="24-hour (HH:mm)">24-hour (18:00)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Work Week Schedule */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Work Week Schedule</h2>
                  <p className="text-sm text-slate-500">Select standard operational days for your organization.</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {daysOfWeek.map((day) => {
                      const isSelected = settings.general.workWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const updated = isSelected
                              ? settings.general.workWeek.filter((d) => d !== day)
                              : [...settings.general.workWeek, day];
                            updateSection("general", "workWeek", updated);
                          }}
                          className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                            isSelected
                              ? "bg-sky-600 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Holidays Calendar */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Holidays Calendar</h2>
                  <p className="text-sm text-slate-500">Days off when tracking and attendance obligations are paused.</p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Holiday title (e.g. Labor Day)"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      className="input-field flex-1"
                    />
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      className="input-field sm:w-48"
                    />
                    <button
                      type="button"
                      onClick={addHoliday}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" /> Add Holiday
                    </button>
                  </div>

                  <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                    {settings.general.holidays?.map((h) => (
                      <div key={h.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">{h.name}</div>
                          <div className="text-xs text-slate-500">{h.date}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeHoliday(h.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. ATTENDANCE & HOURS TAB */}
            {activeTab === "attendance" && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Standard Working Hours</h2>
                  <p className="text-sm text-slate-500">Set organization shift hours and attendance calculation thresholds.</p>

                  <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Shift Start Time</label>
                      <input
                        type="time"
                        value={settings.attendance.workHoursStart}
                        onChange={(e) => updateSection("attendance", "workHoursStart", e.target.value)}
                        className="input-field mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Shift End Time</label>
                      <input
                        type="time"
                        value={settings.attendance.workHoursEnd}
                        onChange={(e) => updateSection("attendance", "workHoursEnd", e.target.value)}
                        className="input-field mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Late Grace Period (Minutes)</label>
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={settings.attendance.gracePeriodMinutes}
                        onChange={(e) => updateSection("attendance", "gracePeriodMinutes", Number(e.target.value))}
                        className="input-field mt-1.5"
                      />
                      <p className="mt-1 text-xs text-slate-400">Mark late only after shift start + grace period.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Minimum Hours for Full Day</label>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={settings.attendance.minHoursFullDay}
                        onChange={(e) => updateSection("attendance", "minHoursFullDay", Number(e.target.value))}
                        className="input-field mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Minimum Hours for Half Day</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={settings.attendance.minHoursHalfDay}
                        onChange={(e) => updateSection("attendance", "minHoursHalfDay", Number(e.target.value))}
                        className="input-field mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Auto Clock-Out Time</label>
                      <input
                        type="time"
                        value={settings.attendance.autoClockOutTime}
                        onChange={(e) => updateSection("attendance", "autoClockOutTime", e.target.value)}
                        className="input-field mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 p-4">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">Automatic Clock-Out</div>
                      <div className="text-xs text-slate-500">Automatically ends open sessions if user forgets to clock out.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.attendance.enableAutoClockOut}
                      onChange={(e) => updateSection("attendance", "enableAutoClockOut", e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Overtime Policy */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Overtime Policies</h2>
                  <p className="text-sm text-slate-500">Compensations and authorizations for work beyond shift hours.</p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Enable Overtime Tracking</div>
                        <div className="text-xs text-slate-500">Track and log hours logged past standard shift duration.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.attendance.enableOvertime}
                        onChange={(e) => updateSection("attendance", "enableOvertime", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Overtime Rate Multiplier</label>
                        <input
                          type="number"
                          step="0.1"
                          min="1.0"
                          max="3.0"
                          value={settings.attendance.overtimeRate}
                          onChange={(e) => updateSection("attendance", "overtimeRate", Number(e.target.value))}
                          className="input-field mt-1.5"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">Require Manager Approval</div>
                          <div className="text-xs text-slate-500">Overtime claims require manager signoff before payroll.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.attendance.requireOvertimeApproval}
                          onChange={(e) => updateSection("attendance", "requireOvertimeApproval", e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ROLES & PERMISSIONS TAB */}
            {activeTab === "roles" && (
              <div className="space-y-6">
                {/* Roles List */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">System Roles</h2>
                  <p className="text-sm text-slate-500">Configured access tiers available in the workspace.</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {settings.roles.rolesList?.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-800"
                      >
                        {r}
                        {!["Admin", "Manager", "Employee"].includes(r) && (
                          <button
                            type="button"
                            onClick={() => removeRole(r)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <input
                      type="text"
                      placeholder="New custom role name..."
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="input-field max-w-xs"
                    />
                    <button
                      type="button"
                      onClick={addCustomRole}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" /> Add Role
                    </button>
                  </div>
                </div>

                {/* Permission Matrix */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 overflow-x-auto">
                  <h2 className="text-lg font-bold text-slate-900">Permission Matrix</h2>
                  <p className="text-sm text-slate-500 mb-6">Select which roles have authority over specific platform actions.</p>

                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">Action Permission</th>
                        {settings.roles.rolesList.map((r) => (
                          <th key={r} className="py-3 px-4 text-center">{r}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { key: "viewReports", label: "View Reports & Analytics" },
                        { key: "approveLeaves", label: "Approve Leave Requests" },
                        { key: "editEmployees", label: "Create & Edit Employees" },
                        { key: "assignTasks", label: "Create & Assign Tasks" },
                        { key: "viewLiveMonitoring", label: "View Live Worker Monitoring" },
                        { key: "manageSettings", label: "Modify System Settings" },
                        { key: "exportData", label: "Export System Data" }
                      ].map((perm) => (
                        <tr key={perm.key} className="hover:bg-slate-50/70">
                          <td className="py-3.5 px-4 font-semibold text-slate-800">{perm.label}</td>
                          {settings.roles.rolesList.map((r) => {
                            const isAllowed = settings.roles.permissions[perm.key]?.includes(r);
                            const isAdmin = r === "Admin";
                            return (
                              <td key={r} className="py-3.5 px-4 text-center">
                                <input
                                  type="checkbox"
                                  disabled={isAdmin}
                                  checked={isAdmin ? true : !!isAllowed}
                                  onChange={() => togglePermission(perm.key, r)}
                                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 disabled:opacity-50"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Team Managers */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Team Managers Assignment</h2>
                  <p className="text-sm text-slate-500 mb-4">Designate management leads for team workflows and approvals.</p>

                  <div className="space-y-3">
                    {settings.roles.teamManagers?.map((item, idx) => (
                      <div key={item.team} className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5">
                        <span className="font-semibold text-slate-900 text-sm">{item.team}</span>
                        <input
                          type="text"
                          value={item.manager}
                          onChange={(e) => {
                            const updated = [...settings.roles.teamManagers];
                            updated[idx].manager = e.target.value;
                            updateSection("roles", "teamManagers", updated);
                          }}
                          className="input-field max-w-xs text-sm py-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 4. LEAVE POLICY TAB */}
            {activeTab === "leave" && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Leave Types & Quotas</h2>
                  <p className="text-sm text-slate-500">Configure annual day allowances, carry-forward caps, and rules.</p>

                  <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {settings.leave.leaveTypes.map((leave, idx) => (
                      <div key={leave.id} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-4 items-center">
                        <div className="font-semibold text-slate-900 text-sm">{leave.name}</div>
                        <div>
                          <label className="text-xs text-slate-400 block">Annual Quota (Days)</label>
                          <input
                            type="number"
                            min="0"
                            value={leave.quota}
                            onChange={(e) => {
                              const updated = [...settings.leave.leaveTypes];
                              updated[idx].quota = Number(e.target.value);
                              updateSection("leave", "leaveTypes", updated);
                            }}
                            className="input-field mt-1 text-sm py-1.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={leave.carryForward}
                            onChange={(e) => {
                              const updated = [...settings.leave.leaveTypes];
                              updated[idx].carryForward = e.target.checked;
                              updateSection("leave", "leaveTypes", updated);
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-xs text-slate-600">Carry Forward (Max: {leave.maxCarry}d)</span>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => removeLeaveType(leave.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add leave type */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <input
                      type="text"
                      placeholder="Leave Name (e.g. Parental)"
                      value={newLeaveType.name}
                      onChange={(e) => setNewLeaveType({ ...newLeaveType, name: e.target.value })}
                      className="input-field flex-1"
                    />
                    <input
                      type="number"
                      placeholder="Quota"
                      value={newLeaveType.quota}
                      onChange={(e) => setNewLeaveType({ ...newLeaveType, quota: Number(e.target.value) })}
                      className="input-field w-24"
                    />
                    <button
                      type="button"
                      onClick={addLeaveType}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" /> Add Type
                    </button>
                  </div>
                </div>

                {/* Workflow Rules */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Approval Workflow</h2>
                  <p className="text-sm text-slate-500 mb-4">Set required review chain for submitted leave requests.</p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="leaveWorkflow"
                        value="manager_then_admin"
                        checked={settings.leave.workflow === "manager_then_admin"}
                        onChange={(e) => updateSection("leave", "workflow", e.target.value)}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Two-Tier: Manager Review then Admin Signoff</div>
                        <div className="text-xs text-slate-500">First reviewed by designated team manager, then approved by admin.</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="leaveWorkflow"
                        value="direct_admin"
                        checked={settings.leave.workflow === "direct_admin"}
                        onChange={(e) => updateSection("leave", "workflow", e.target.value)}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Direct Admin Approval</div>
                        <div className="text-xs text-slate-500">Requests go directly to the HR/Admin queue for fast resolution.</div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-5 max-w-sm">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Require Document Attachment After (Days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.leave.requireAttachmentDays}
                      onChange={(e) => updateSection("leave", "requireAttachmentDays", Number(e.target.value))}
                      className="input-field mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. MONITORING & PRIVACY TAB */}
            {activeTab === "monitoring" && (
              <div className="space-y-6">
                {/* Activity & Screenshot Tracking */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Activity & Screen Monitoring</h2>
                  <p className="text-sm text-slate-500">Real-time worker surveillance and idle threshold criteria.</p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Screen Activity Tracking</div>
                        <div className="text-xs text-slate-500">Track active window titles and input activity.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.monitoring.screenActivityTracking}
                        onChange={(e) => updateSection("monitoring", "screenActivityTracking", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Automated Screenshot Capture</div>
                        <div className="text-xs text-slate-500">Periodically capture employee workstation screens during work shifts.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.monitoring.screenshotCapture}
                        onChange={(e) => updateSection("monitoring", "screenshotCapture", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Idle Threshold (Minutes)</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={settings.monitoring.idleThresholdMinutes}
                          onChange={(e) => updateSection("monitoring", "idleThresholdMinutes", Number(e.target.value))}
                          className="input-field mt-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Screenshot Interval (Min)</label>
                        <select
                          value={settings.monitoring.screenshotIntervalMinutes}
                          onChange={(e) => updateSection("monitoring", "screenshotIntervalMinutes", Number(e.target.value))}
                          className="input-field mt-1.5"
                        >
                          <option value="5">Every 5 minutes</option>
                          <option value="10">Every 10 minutes</option>
                          <option value="15">Every 15 minutes</option>
                          <option value="30">Every 30 minutes</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Daily Target (%)</label>
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={settings.monitoring.dailyProductivityTarget}
                          onChange={(e) => updateSection("monitoring", "dailyProductivityTarget", Number(e.target.value))}
                          className="input-field mt-1.5"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">Blur Screenshot Preview</div>
                          <div className="text-xs text-slate-500">Obscure sensitive text for privacy protection.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.monitoring.blurScreenshots}
                          onChange={(e) => updateSection("monitoring", "blurScreenshots", e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">Working-Hours-Only Tracking</div>
                          <div className="text-xs text-slate-500">Disable all monitoring outside assigned shift hours.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.monitoring.workingHoursOnly}
                          onChange={(e) => updateSection("monitoring", "workingHoursOnly", e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Productivity Rules */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">App & Website Classification</h2>
                  <p className="text-sm text-slate-500">Categorize software and domains into Productive, Neutral, or Unproductive.</p>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      placeholder="Name or domain (e.g. Figma, Canva)"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      className="input-field flex-1"
                    />
                    <select
                      value={newRule.type}
                      onChange={(e) => setNewRule({ ...newRule, type: e.target.value })}
                      className="input-field sm:w-36"
                    >
                      <option value="app">Desktop App</option>
                      <option value="website">Website</option>
                    </select>
                    <select
                      value={newRule.category}
                      onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                      className="input-field sm:w-40"
                    >
                      <option value="Productive">Productive</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Unproductive">Unproductive</option>
                    </select>
                    <button
                      type="button"
                      onClick={addProductivityRule}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Plus className="h-4 w-4" /> Add Rule
                    </button>
                  </div>

                  <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {settings.monitoring.productivityRules.map((rule, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3.5">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 text-sm">{rule.name}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 uppercase">
                            {rule.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              rule.category === "Productive"
                                ? "bg-emerald-100 text-emerald-800"
                                : rule.category === "Unproductive"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {rule.category}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProductivityRule(idx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Privacy & Compliance */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Privacy & Legal Compliance</h2>
                  <p className="text-sm text-slate-500">Employee consent text, retention policies, and transparency options.</p>

                  <div className="mt-5 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Employee Consent Notice</label>
                      <textarea
                        rows="3"
                        value={settings.monitoring.employeeConsentNotice}
                        onChange={(e) => updateSection("monitoring", "employeeConsentNotice", e.target.value)}
                        className="input-field mt-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Data Retention Period (Days)</label>
                        <select
                          value={settings.monitoring.dataRetentionDays}
                          onChange={(e) => updateSection("monitoring", "dataRetentionDays", Number(e.target.value))}
                          className="input-field mt-1.5"
                        >
                          <option value="15">15 Days</option>
                          <option value="30">30 Days (Recommended)</option>
                          <option value="60">60 Days</option>
                          <option value="90">90 Days</option>
                          <option value="180">180 Days</option>
                        </select>
                      </div>

                      <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                        <div className="text-xs font-bold uppercase text-slate-700">Employee Self-Visibility</div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Can view own screenshots</span>
                          <input
                            type="checkbox"
                            checked={settings.monitoring.visibility.employeeCanViewScreenshots}
                            onChange={(e) =>
                              updateSection("monitoring", "visibility", {
                                ...settings.monitoring.visibility,
                                employeeCanViewScreenshots: e.target.checked
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600">
                          <span>Can view productivity rating</span>
                          <input
                            type="checkbox"
                            checked={settings.monitoring.visibility.employeeCanViewProductivityScore}
                            onChange={(e) =>
                              updateSection("monitoring", "visibility", {
                                ...settings.monitoring.visibility,
                                employeeCanViewProductivityScore: e.target.checked
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Alert Rules & Channels</h2>
                  <p className="text-sm text-slate-500">Configure triggering thresholds for automated alerts and admin updates.</p>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Late Arrival Alert</div>
                        <div className="text-xs text-slate-500">Notify supervisors when an employee clocks in after grace period.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.alertOnLateArrival}
                        onChange={(e) => updateSection("notifications", "alertOnLateArrival", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Long Idle Time Alert</div>
                        <div className="text-xs text-slate-500">Trigger alert when continuous inactive duration exceeds threshold.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.alertOnLongIdle}
                        onChange={(e) => updateSection("notifications", "alertOnLongIdle", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Leave Request Submissions</div>
                        <div className="text-xs text-slate-500">Instant notification when a staff member files a new leave application.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.alertOnLeaveRequest}
                        onChange={(e) => updateSection("notifications", "alertOnLeaveRequest", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Task Overdue Notice</div>
                        <div className="text-xs text-slate-500">Remind managers and assignees when milestone deadlines pass.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.alertOnTaskOverdue}
                        onChange={(e) => updateSection("notifications", "alertOnTaskOverdue", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Scheduled Summaries */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Admin Digest Summaries</h2>
                  <p className="text-sm text-slate-500">Automated performance rollups sent directly to leadership.</p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Daily Attendance Summary</div>
                        <div className="text-xs text-slate-500">End-of-day attendance, working hours, and absent list.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.adminDailySummary}
                        onChange={(e) => updateSection("notifications", "adminDailySummary", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <div className="font-semibold text-slate-900 text-sm">Weekly Productivity Report</div>
                        <div className="text-xs text-slate-500">Aggregated team productivity metrics every Friday evening.</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.adminWeeklySummary}
                        onChange={(e) => updateSection("notifications", "adminWeeklySummary", e.target.checked)}
                        className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  <div className="mt-5 max-w-xs">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Daily Summary Delivery Time</label>
                    <input
                      type="time"
                      value={settings.notifications.summaryDeliveryTime}
                      onChange={(e) => updateSection("notifications", "summaryDeliveryTime", e.target.value)}
                      className="input-field mt-1.5"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 7. SECURITY & AUDIT TAB */}
            {activeTab === "security" && (
              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Authentication & Access Policies</h2>
                  <p className="text-sm text-slate-500">Account hardening, session lifecycles, and network restrictions.</p>

                  <div className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Minimum Password Length</label>
                        <input
                          type="number"
                          min="6"
                          max="32"
                          value={settings.security.minPasswordLength}
                          onChange={(e) => updateSection("security", "minPasswordLength", Number(e.target.value))}
                          className="input-field mt-1.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Session Timeout (Minutes)</label>
                        <input
                          type="number"
                          min="15"
                          max="480"
                          value={settings.security.sessionTimeoutMinutes}
                          onChange={(e) => updateSection("security", "sessionTimeoutMinutes", Number(e.target.value))}
                          className="input-field mt-1.5"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">Two-Factor Authentication (2FA)</div>
                          <div className="text-xs text-slate-500">Require OTP code upon sign-in.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.twoFactorAuth}
                          onChange={(e) => updateSection("security", "twoFactorAuth", e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">Require Special Characters</div>
                          <div className="text-xs text-slate-500">Password must contain !@#$%^&* symbols.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.requireSpecialChar}
                          onChange={(e) => updateSection("security", "requireSpecialChar", e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                        <div>
                          <div className="font-semibold text-slate-900 text-sm">Require Numbers</div>
                          <div className="text-xs text-slate-500">Password must contain at least one numeric digit.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.security.requireNumber}
                          onChange={(e) => updateSection("security", "requireNumber", e.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* IP Allowlist */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">IP Whitelist / Geofence</h2>
                      <p className="text-sm text-slate-500">Restrict access to designated office IPs or secure VPNs.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.ipAllowlistEnabled}
                      onChange={(e) => updateSection("security", "ipAllowlistEnabled", e.target.checked)}
                      className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                  </div>

                  {settings.security.ipAllowlistEnabled && (
                    <div className="mt-5 space-y-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.50 or 10.0.0.0/24"
                          value={newIp}
                          onChange={(e) => setNewIp(e.target.value)}
                          className="input-field max-w-sm"
                        />
                        <button
                          type="button"
                          onClick={addIp}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Add IP
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {settings.security.allowedIps?.map((ip) => (
                          <span
                            key={ip}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-mono font-semibold text-slate-800"
                          >
                            {ip}
                            <button
                              type="button"
                              onClick={() => removeIp(ip)}
                              className="text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live Audit Log */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 overflow-x-auto">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Recent Security Audit Logs</h2>
                      <p className="text-sm text-slate-500">Live records of system authentications, logins, and operational changes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={fetchAuditLogs}
                      className="text-xs font-semibold text-sky-600 hover:underline"
                    >
                      Refresh Logs
                    </button>
                  </div>

                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {auditLogs.length > 0 ? (
                        auditLogs.slice(0, 10).map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {log.first_name ? `${log.first_name} ${log.last_name || ""}` : "System User"}
                            </td>
                            <td className="py-2.5 px-3 text-sky-700">{log.activity_type || "Login"}</td>
                            <td className="py-2.5 px-3 text-slate-500">{log.ip_address || "127.0.0.1"}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-slate-400 font-sans">
                            No recent audit logs available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 8. INTEGRATIONS & DATA TAB */}
            {activeTab === "integrations" && (
              <div className="space-y-6">
                {/* API & Webhooks */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Developer API & Webhooks</h2>
                  <p className="text-sm text-slate-500">Connect third-party analytics, payroll software, or corporate HRMS.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Active API Key</label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type={showApiKey ? "text" : "password"}
                          readOnly
                          value={settings.integrations.apiKey}
                          className="input-field font-mono text-sm max-w-md bg-slate-50"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 text-slate-600"
                          title="Toggle visibility"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settings.integrations.apiKey);
                            toast.success("API key copied to clipboard!");
                          }}
                          className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 text-slate-600"
                          title="Copy Key"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Outbound Event Webhook URL</label>
                      <input
                        type="url"
                        value={settings.integrations.webhookUrl}
                        onChange={(e) => updateSection("integrations", "webhookUrl", e.target.value)}
                        placeholder="https://company.com/api/webhooks"
                        className="input-field mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Team Chat Integrations */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Collaboration Alerts</h2>
                  <p className="text-sm text-slate-500">Dispatch alerts into Slack channels or Microsoft Teams spaces.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Slack Incoming Webhook</label>
                      <input
                        type="url"
                        value={settings.integrations.slackWebhookUrl}
                        onChange={(e) => updateSection("integrations", "slackWebhookUrl", e.target.value)}
                        placeholder="https://hooks.slack.com/services/..."
                        className="input-field mt-1.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Microsoft Teams Connector URL</label>
                      <input
                        type="url"
                        value={settings.integrations.teamsWebhookUrl}
                        onChange={(e) => updateSection("integrations", "teamsWebhookUrl", e.target.value)}
                        placeholder="https://outlook.office.com/webhook/..."
                        className="input-field mt-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Exports */}
                <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Data Exports & Backup</h2>
                  <p className="text-sm text-slate-500">Download platform data archives or initiate manual snapshots.</p>

                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => handleExportData("employees")}
                      className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 transition"
                    >
                      <Download className="h-5 w-5 text-sky-600" />
                      <div className="font-semibold text-slate-900 text-sm">Export Employees</div>
                      <div className="text-xs text-slate-500">Directory profiles & records (CSV)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportData("attendance_logs")}
                      className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 transition"
                    >
                      <Download className="h-5 w-5 text-emerald-600" />
                      <div className="font-semibold text-slate-900 text-sm">Export Attendance</div>
                      <div className="text-xs text-slate-500">Complete historical check-ins (CSV)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportData("reports")}
                      className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 transition"
                    >
                      <Download className="h-5 w-5 text-amber-600" />
                      <div className="font-semibold text-slate-900 text-sm">Export Reports</div>
                      <div className="text-xs text-slate-500">Tickets & status audit logs (CSV)</div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
