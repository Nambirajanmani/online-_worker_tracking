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
      socket.join("admin_room");
    }

    // Get employee_id for room joining
    pool.query("SELECT id FROM employees WHERE user_id = $1", [socket.user.id])
      .then(result => {
        if (result.rows.length > 0) {
          socket.employee_id = result.rows[0].id;
          socket.join(`employee_${socket.employee_id}`);
        }
      })
      .catch(err => console.error("Error getting employee_id:", err));

    // Task events
    socket.on("task:joinRoom", (taskId) => {
      socket.join(`task_${taskId}`);
    });

    socket.on("task:leaveRoom", (taskId) => {
      socket.leave(`task_${taskId}`);
    });

    // Receive live status updates from employee client
    socket.on("timer:status_ping", (data) => {
      // Broadcast this to admins for live monitoring
      io.to("admin_room").emit("timer:status_update", {
        employee_id: socket.employee_id,
        ...data
      });
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });
};

