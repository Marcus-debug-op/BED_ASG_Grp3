const express = require("express");
const operatorDashboardController = require("../Controllers/operatorDashboardController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/", requireRole("operator"), operatorDashboardController.getMetrics
  /*
    #swagger.ignore = true
  */
);

router.get("/metrics", requireRole("operator"), operatorDashboardController.getMetrics
  /*
    #swagger.tags = ['Operator - Dashboard']
    #swagger.summary = 'Get operator dashboard metrics'
    #swagger.description = 'Returns summary statistics for the operator dashboard.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

module.exports = router;