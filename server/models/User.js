const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");

class User {
  static async create({ email, password, role }) {
    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 10));
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at`,
      [email, passwordHash, role || "employee"]
    );
    return result.rows[0];
  }

  static async findByEmail(email) {
    const result = await pool.query(
      `SELECT u.*, e.id AS employee_id, e.first_name, e.last_name, e.employee_code, e.department, e.position
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE u.email = $1`,
      [email]
    );
    return result.rows[0];
  }

  static async findById(id) {
    const result = await pool.query(
      `SELECT u.*, e.id AS employee_id, e.first_name, e.last_name, e.employee_code, e.department, e.position
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE u.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async comparePassword(plainPassword, passwordHash) {
    return bcrypt.compare(plainPassword, passwordHash);
  }

  static async updateLastLogin(id) {
    await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [id]);
  }

  static async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, Number(process.env.BCRYPT_ROUNDS || 10));
    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [passwordHash, id]
    );
  }
}

module.exports = User;
