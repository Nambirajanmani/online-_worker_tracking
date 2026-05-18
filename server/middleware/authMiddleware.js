const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Not authorized, no token" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT u.*, e.id AS employee_id, e.first_name, e.last_name, e.employee_code, e.department, e.position
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: "User not found or inactive" });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired" });
    }
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied. Admin only." });
};

const employeeOnly = (req, res, next) => {
  if (req.user?.role === "employee" || req.user?.role === "admin") {
    return next();
  }
  return res.status(403).json({ success: false, message: "Access denied." });
};

module.exports = { protect, adminOnly, employeeOnly };
