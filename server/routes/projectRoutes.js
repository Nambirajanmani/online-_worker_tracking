const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getProjects } = require("../controllers/projectController");

const router = express.Router();

router.get("/", protect, getProjects);

module.exports = router;
