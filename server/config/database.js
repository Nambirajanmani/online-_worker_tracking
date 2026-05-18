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
    await createTables(client);
  } finally {
    client.release();
  }
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
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_by INTEGER REFERENCES employees(id),
      assigned_to INTEGER REFERENCES employees(id),
      project_id INTEGER REFERENCES projects(id),
      priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
      status VARCHAR(50) CHECK (status IN ('pending', 'in-progress', 'completed', 'on-hold')) DEFAULT 'pending',
      due_date DATE,
      completed_at TIMESTAMP,
      estimated_hours DECIMAL(5,2),
      actual_hours DECIMAL(5,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
      leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'personal', 'unpaid')),
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days INTEGER,
      reason TEXT,
      status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      approved_by INTEGER REFERENCES employees(id),
      comments TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id SERIAL PRIMARY KEY,
      employee_id INTEGER REFERENCES employees(id),
      activity_type VARCHAR(100),
      description TEXT,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

  await client.query(`CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to)`);
  await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
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
