const express = require("express");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { getTrackingSummary } = require("../controllers/trackingController");

const router = express.Router();

router.get("/", protect, adminOnly, getTrackingSummary);

module.exports = router;
