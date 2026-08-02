const express = require("express");
const vendorDashboardController = require("../Controllers/vendorDashboardController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();


router.get("/", requireRole("vendor"), vendorDashboardController.getDashboard
  /*
    #swagger.tags = ['Vendor - Dashboard']
    #swagger.summary = 'Get vendor dashboard metrics'
    #swagger.description = 'Returns dashboard statistics for the authenticated vendor. Month and year may be supplied to filter the results.'
    #swagger.security = [{ "bearerAuth": [] }]

    #swagger.parameters['month'] = {
      in: 'query',
      type: 'integer',
      required: false,
      minimum: 1,
      maximum: 12,
      description: 'Month used to filter dashboard results'
    }

    #swagger.parameters['year'] = {
      in: 'query',
      type: 'integer',
      required: false,
      description: 'Year used to filter dashboard results'
    }

    #swagger.responses[200] = {
      description: 'Vendor dashboard retrieved successfully'
    }

    #swagger.responses[401] = {
      description: 'Authentication required'
    }

    #swagger.responses[403] = {
      description: 'Vendor access required'
    }
  */
);

module.exports = router;