const { pool } = require("../config/database");

const defaultSettings = {
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
    employeeConsentNotice: "Notice: Screen activity, idle times, and application usage are monitored during official working hours to ensure productivity and workplace safety.",
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

// Ensure settings table exists
const ensureSettingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50) UNIQUE NOT NULL,
      settings JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  for (const [category, values] of Object.entries(defaultSettings)) {
    await pool.query(
      `INSERT INTO company_settings (category, settings)
       VALUES ($1, $2)
       ON CONFLICT (category) DO NOTHING;`,
      [category, JSON.stringify(values)]
    );
  }
};

// GET all settings
const getAllSettings = async (req, res) => {
  try {
    await ensureSettingsTable();
    const result = await pool.query("SELECT category, settings FROM company_settings");

    const settingsMap = { ...defaultSettings };
    result.rows.forEach((row) => {
      settingsMap[row.category] = { ...defaultSettings[row.category], ...row.settings };
    });

    res.json({ success: true, data: settingsMap });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ success: false, message: "Failed to retrieve settings" });
  }
};

// PUT /:category
const updateCategorySettings = async (req, res) => {
  const { category } = req.params;
  const newSettings = req.body;

  if (!defaultSettings[category]) {
    return res.status(400).json({ success: false, message: `Unknown category: ${category}` });
  }

  try {
    await ensureSettingsTable();

    // Fetch existing
    const existing = await pool.query(
      "SELECT settings FROM company_settings WHERE category = $1",
      [category]
    );

    const merged = {
      ...(defaultSettings[category] || {}),
      ...(existing.rows[0]?.settings || {}),
      ...newSettings
    };

    await pool.query(
      `INSERT INTO company_settings (category, settings, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (category)
       DO UPDATE SET settings = EXCLUDED.settings, updated_at = CURRENT_TIMESTAMP;`,
      [category, JSON.stringify(merged)]
    );

    res.json({
      success: true,
      message: `${category.charAt(0).toUpperCase() + category.slice(1)} settings updated successfully`,
      data: merged
    });
  } catch (error) {
    console.error(`Error updating ${category} settings:`, error);
    res.status(500).json({ success: false, message: `Failed to update ${category} settings` });
  }
};

// POST /reset
const resetCategorySettings = async (req, res) => {
  const { category } = req.body;
  try {
    await ensureSettingsTable();
    if (category && defaultSettings[category]) {
      await pool.query(
        `UPDATE company_settings SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE category = $2`,
        [JSON.stringify(defaultSettings[category]), category]
      );
      return res.json({
        success: true,
        message: `Reset ${category} settings to default`,
        data: defaultSettings[category]
      });
    }

    // Reset all
    for (const [cat, val] of Object.entries(defaultSettings)) {
      await pool.query(
        `INSERT INTO company_settings (category, settings, updated_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (category) DO UPDATE SET settings = EXCLUDED.settings, updated_at = CURRENT_TIMESTAMP;`,
        [cat, JSON.stringify(val)]
      );
    }

    res.json({ success: true, message: "All settings reset to defaults", data: defaultSettings });
  } catch (error) {
    console.error("Error resetting settings:", error);
    res.status(500).json({ success: false, message: "Failed to reset settings" });
  }
};

// GET /audit-logs
const getAuditLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, e.first_name, e.last_name, e.department
      FROM activity_logs al
      LEFT JOIN employees e ON al.employee_id = e.id
      ORDER BY al.timestamp DESC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ success: false, message: "Failed to fetch audit logs" });
  }
};

module.exports = {
  getAllSettings,
  updateCategorySettings,
  resetCategorySettings,
  getAuditLogs
};
