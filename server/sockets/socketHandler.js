const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Authentication error"));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await pool.query("SELECT * FROM users WHERE id = $1 AND is_active = true", [decoded.id]);
      if (!result.rows.length) {
        return next(new Error("User not found"));
      }
      socket.user = result.rows[0];
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user_${socket.user.id}`);
    if (socket.user.role === "admin") {
      socket.join("admin");
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};
