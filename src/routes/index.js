const express = require("express");
const multer = require("multer");
const {
  analyze,
  analyzePdf,
  getHistoryItem,
  getReport,
  listHistory,
  submitFeedback
} = require("../controllers/analysis-controller");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

router.get("/health", (req, res) => res.json({ status: "ok", service: "ragflow-engine" }));
router.post("/api/v1/analyze", analyze);
router.post("/api/v1/analyze/pdf", upload.single("resume_pdf"), analyzePdf);
router.post("/api/v1/feedback", submitFeedback);
router.get("/api/v1/analyses", listHistory);
router.get("/api/v1/analyses/:id", getHistoryItem);
router.get("/api/v1/analyses/:id/report", getReport);

module.exports = { router };
