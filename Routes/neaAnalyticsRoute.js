const express = require("express");
const neaAnalyticsController = require("../Controllers/neaAnalyticsController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/analytics", requireRole("officer"), neaAnalyticsController.getAnalytics);

module.exports = router;