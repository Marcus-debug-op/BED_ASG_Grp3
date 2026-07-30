const express = require("express");
const vendorDashboardController = require("../Controllers/vendorDashboardController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/vendor/dashboard:
 *   get:
 *     summary: Retrieve vendor dashboard metrics
 *     description: Returns dashboard statistics for the authenticated vendor. Optional month and year query parameters can be supplied to filter the dashboard data.
 *     tags:
 *       - Vendor Dashboard
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Month to filter dashboard metrics.
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: integer
 *         description: Year to filter dashboard metrics.
 *     responses:
 *       200:
 *         description: Vendor dashboard retrieved successfully.
 *       401:
 *         description: Authentication required.
 *       403:
 *         description: Vendor access only.
 */
router.get("/", requireRole("vendor"), vendorDashboardController.getDashboard);

module.exports = router;