const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getOverviewReport } = require("../controllers/reportController");

const router = express.Router();

router.get("/", protect, getOverviewReport);

module.exports = router;
