const express = require("express");
const neaAnalyticsController = require("../Controllers/neaAnalyticsController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/analytics", requireRole("officer"), neaAnalyticsController.getAnalytics
  /*
    #swagger.tags = ['NEA - Inspections']
    #swagger.summary = 'Get NEA analytics'
    #swagger.description = 'Returns hygiene-grade and inspection analytics for an authenticated NEA officer.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

module.exports = router;