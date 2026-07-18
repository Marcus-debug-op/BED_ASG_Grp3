const express = require("express");
const vendorDashboardController = require("../Controllers/vendorDashboardController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/", requireRole("vendor"), vendorDashboardController.getDashboard);

module.exports = router;
