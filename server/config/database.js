const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const requiredEnvVars = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"];
const missingEnvVars = requiredEnvVars.filter((key) => typeof process.env[key] !== "string" || process.env[key].trim() === "");

if (missingEnvVars.length) {
  throw new Error(
    `Missing required database environment variables: ${missingEnvVars.join(", ")}. ` +
      "Create server/.env from server/.env.example and fill in your PostgreSQL credentials."
  );
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on("connect", () => {
  console.log("Connected to PostgreSQL database");
});

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error", error);
});

const connectDB = async () => {
  const client = await pool.connect();
  try {
    // Migrate old tasks schema to new schema if needed
    await migrateTasksSchema(client);
    await createTables(client);
  } finally {
    client.release();
  }
};

const migrateTasksSchema = async (client) => {
  try {
    // Check if old tasks table exists with assigned_to column
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'assigned_to'
    `);
    
    if (result.rows.length > 0) {
      // Old schema exists, drop task_updates first due to foreign key
      await client.query(`DROP TABLE IF EXISTS task_updates CASCADE`);
      // Drop old tasks table
      await client.query(`DROP TABLE IF EXISTS tasks CASCADE`);
      console.log("Dropped old tasks and task_updates tables for schema migration");
    }
  } catch (error) {
    console.log("Tasks schema check passed (new schema or table doesn't exist)");
  }
};

const migrateAttendanceSchema = async (client) => {
  await client.query(`
    ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `);

  await client.query(`ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_status_check`);

  try {
    await client.query(`
      ALTER TABLE attendance
      ADD CONSTRAINT attendance_status_check
      CHECK (status IN ('present', 'absent', 'late', 'half-day', 'working', 'completed'))
    `);
  } catch (error) {
    if (error.code !== "42710") {
      throw error;
    }
  }
};

const migrateLeaveRequestsSchema = async (client) => {
  await client.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_url TEXT`);
  await client.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`);
  await client.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_name VARCHAR(255)`);
  await client.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS admin_remark TEXT`);

  await client.query(`
    UPDATE leave_requests lr
    SET employee_name = TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')))
    FROM employees e
    WHERE lr.employee_id = e.id AND (lr.employee_name IS NULL OR lr.employee_name = '')
  `);

  await client.query(`
    UPDATE leave_requests
    SET admin_remark = comments
    WHERE admin_remark IS NULL AND comments IS NOT NULL
  `);

  await client.query(`ALTER TABLE leave_requests DROP CONSTRAINT IF EXISTS leave_requests_leave_type_check`);

  await client.query(`UPDATE leave_requests SET leave_type = 'paid' WHERE leave_type = 'annual'`);
  await client.query(`UPDATE leave_requests SET leave_type = 'casual' WHERE leave_type = 'personal'`);

  try {
    await client.query(`
      ALTER TABLE leave_requests
      ADD CONSTRAINT leave_requests_leave_type_check
      CHECK (leave_type IN ('sick', 'casual', 'emergency', 'paid', 'unpaid'))
    `);
  } catch (error) {
    if (error.code !== "42710") {
      throw error;
    }
  }
};

const migrateActivityLogsSchema = async (client) => {
  await client.query(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS session_id INTEGER`);
  await client.query(`ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
};

const createTables = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
      is_active BOOLEAN DEFAULT true,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      employee_code VARCHAR(50) UNIQUE NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      department VARCHAR(100),
      position VARCHAR(100),
      phone VARCHAR(20),
      address TEXT,
      profile_pic VARCHAR(255),
      joining_date DATE,
      reporting_manager INTEGER REFERENCES employees(id),
      salary DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      clock_in_time TIME,
      clock_out_time TIME,
      total_hours DECIMAL(5,2),
      status VARCHAR(50) CHECK (status IN ('present', 'absent', 'late', 'half-day')) DEFAULT 'absent',
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(employee_id, date)
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      client_name VARCHAR(255),
      start_date DATE,
      end_date DATE,
      status VARCHAR(50) DEFAULT 'active',
      budget DECIMAL(10,2),
      created_by INTEGER REFERENCES employees(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      employee_name VARCHAR(255),
      task_title VARCHAR(255) NOT NULL,
      task_description TEXT,
      priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      status VARCHAR(50) CHECK (status IN ('pending', 'in-progress', 'completed', 'on-hold')) DEFAULT 'pending',
      start_date DATE,
      due_date DATE,
      attachment VARCHAR(500),
      assigned_by INTEGER REFERENCES employees(id),
      estimated_hours DECIMAL(5,2),
      actual_hours DECIMAL(5,2) DEFAULT 0,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS task_updates (
      id SERIAL PRIMARY KEY,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      comment TEXT,
      file VARCHAR(500),
      status VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id),
      task_id INTEGER REFERENCES tasks(id),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration DECIMAL(5,2),
      description TEXT,
      is_billable BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id),
      employee_name VARCHAR(255),
      leave_type VARCHAR(50) CHECK (leave_type IN ('sick', 'casual', 'emergency', 'paid', 'unpaid')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days INTEGER,
      reason TEXT,
      attachment_url TEXT,
      status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      approved_by INTEGER REFERENCES employees(id),
      approved_at TIMESTAMP,
      admin_remark TEXT,
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      employee_id INTEGER REFERENCES employees(id),
      activity_type VARCHAR(100),
      description TEXT,
      ip_address INET,
      user_agent TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS timer_sessions (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      employee_name VARCHAR(255),
      task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      task_name VARCHAR(255),
      project_name VARCHAR(255),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      total_duration INTEGER DEFAULT 0,
      active_duration INTEGER DEFAULT 0,
      idle_duration INTEGER DEFAULT 0,
      break_duration INTEGER DEFAULT 0,
      status VARCHAR(50) CHECK (status IN ('running', 'paused', 'stopped', 'idle')) DEFAULT 'running',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255),
      message TEXT,
      type VARCHAR(50),
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id SERIAL PRIMARY KEY,
      attendance_id INTEGER REFERENCES attendance(id) ON DELETE CASCADE,
      employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL CHECK (action IN ('clock_in', 'clock_out')),
      action_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      clock_in_time TIME,
      clock_out_time TIME,
      total_hours DECIMAL(5,2),
      status VARCHAR(50),
      attendance_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_logs_employee ON attendance_logs(employee_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_logs_date ON attendance_logs(attendance_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)`);

  await migrateAttendanceSchema(client);
  await migrateLeaveRequestsSchema(client);
  await migrateActivityLogsSchema(client);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(employee_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_updates_task ON task_updates(task_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_task_updates_employee ON task_updates(employee_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_employee ON activity_logs(employee_id)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);

  const hashedPassword = await bcrypt.hash("Admin@123", Number(process.env.BCRYPT_ROUNDS || 10));
  const adminCheck = await client.query("SELECT id FROM users WHERE email = $1", ["admin@example.com"]);

  let adminUserId;

  if (adminCheck.rows.length === 0) {
    const userResult = await client.query(
      "INSERT INTO users (email, password_hash, role, is_active) VALUES ($1, $2, $3, true) RETURNING id",
      ["admin@example.com", hashedPassword, "admin"]
    );
    adminUserId = userResult.rows[0].id;
    console.log("Default admin created: admin@example.com / Admin@123");
  } else {
    adminUserId = adminCheck.rows[0].id;
    await client.query(
      `UPDATE users
       SET password_hash = $1, role = 'admin', is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, adminUserId]
    );
    console.log("Default admin credentials refreshed: admin@example.com / Admin@123");
  }

  const adminEmployeeCheck = await client.query(
    "SELECT id FROM employees WHERE user_id = $1",
    [adminUserId]
  );

  if (adminEmployeeCheck.rows.length === 0) {
    await client.query(
      `INSERT INTO employees (
        user_id, employee_code, first_name, last_name, department, position, joining_date
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)`,
      [adminUserId, "ADMIN001", "System", "Administrator", "Management", "System Administrator"]
    );
  }
};

module.exports = { pool, connectDB };
