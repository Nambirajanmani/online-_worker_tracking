const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const { pool } = require("../config/database");
const { sendEmail } = require("../utils/sendEmail");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || "15m" });

const generateRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d" });

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user || !(await User.comparePassword(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    if (!user.is_active) {
      return res.status(401).json({ success: false, message: "Account is deactivated. Please contact administrator." });
    }

    await User.updateLastLogin(user.id);

    if (user.employee_id) {
      await pool.query(
        `INSERT INTO activity_logs (employee_id, activity_type, description, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.employee_id, "login", "User logged in", req.ip, req.headers["user-agent"]]
      );
    }

    return res.json({
      success: true,
      token: generateToken(user.id),
      refreshToken: generateRefreshToken(user.id),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
        employeeId: user.employee_id,
        employeeCode: user.employee_code
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const logout = async (req, res) => {
  if (req.user?.employee_id) {
    await pool.query(
      `INSERT INTO activity_logs (employee_id, activity_type, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.employee_id, "logout", "User logged out", req.ip, req.headers["user-agent"]]
    );
  }
  res.json({ success: true, message: "Logged out successfully" });
};

const refreshToken = async (req, res) => {
  try {
    const incomingRefreshToken = req.body.refreshToken;
    if (!incomingRefreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }

    const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid refresh token" });
    }

    return res.json({ success: true, token: generateToken(user.id) });
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid refresh token" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const user = await User.findByEmail(req.body.email);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const resetUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Reset your password using this link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
    });

    return res.json({ success: true, message: "Password reset email sent" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const token = req.body.token;
    const newPassword = req.body.newPassword || req.body.password;

    if (!token || !newPassword) {
      return res.status(400).json({ success: false, message: "Token and new password required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await User.updatePassword(decoded.id, newPassword);
    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({ success: false, message: "Reset token has expired" });
    }
    return res.status(400).json({ success: false, message: "Invalid or expired token" });
  }
};

module.exports = { login, logout, refreshToken, forgotPassword, resetPassword };
