const { logger } = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack || err.message);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Server Error";

  if (err.code === "22P02") {
    statusCode = 404;
    message = "Resource not found";
  }

  if (err.code === "23505") {
    statusCode = 400;
    message = "Duplicate field value entered";
  }

  if (err.code === "23503") {
    statusCode = 400;
    message = "Related record not found";
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
};

module.exports = { errorHandler };
