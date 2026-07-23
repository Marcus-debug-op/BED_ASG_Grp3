const express = require("express");
const operatorDashboardController = require("../Controllers/operatorDashboardController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/", requireRole("operator"), operatorDashboardController.getMetrics);
router.get("/metrics", requireRole("operator"), operatorDashboardController.getMetrics);

module.exports = router;