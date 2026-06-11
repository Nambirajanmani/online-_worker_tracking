const express = require("express");
const multer = require("multer");
const path = require("path");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  createReport,
  getMyReports,
  getAllReports,
  getReportById,
  updateReport,
  getReportStatistics,
  downloadAttachment,
  getOverviewReport,
} = require("../controllers/reportController");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allow only specific file types
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
    "text/plain",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const router = express.Router();

// Employee Routes
router.post("/create", protect, upload.single("attachment"), createReport);
router.get("/my-reports", protect, getMyReports);

// Admin Routes
router.get("/admin/all", protect, adminOnly, getAllReports);
router.get("/admin/stats", protect, adminOnly, getReportStatistics);
router.get("/admin/:id", protect, adminOnly, getReportById);
router.put("/admin/:id", protect, adminOnly, updateReport);
router.get("/download/:id", protect, downloadAttachment);

// Overview report (existing endpoint)
router.get("/overview", protect, adminOnly, getOverviewReport);

module.exports = router;
