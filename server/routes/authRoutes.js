const express = require("express");
const { body } = require("express-validator");
const { login, logout, refreshToken, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  login
);
router.post("/logout", protect, logout);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", [body("email").isEmail().normalizeEmail()], forgotPassword);
router.post(
  "/reset-password",
  [body("token").notEmpty(), body("newPassword").optional().isLength({ min: 6 }), body("password").optional().isLength({ min: 6 })],
  resetPassword
);

module.exports = router;
