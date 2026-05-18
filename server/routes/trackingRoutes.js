const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getTrackingSummary } = require("../controllers/trackingController");

const router = express.Router();

router.get("/", protect, getTrackingSummary);

module.exports = router;
