const express = require("express");
const stallController = require("../Controllers/stallController");
const { optionalAuth } = require("../Middlewares/authMiddleware");

const router = express.Router();

// Public browsing routes - guests and patrons can both view stalls/menus,
// so this uses optionalAuth (same pattern as hawkerCentreRoute) rather than requireAuth.
router.get("/", optionalAuth, stallController.getStalls
  /*
    #swagger.tags = ['Stalls']
    #swagger.description = 'BED-61: List all active hawker stalls. Supports optional search and cuisine query params for BED-49 browse/filter.'
    #swagger.parameters['search'] = { in: 'query', required: false, type: 'string', description: 'Keyword to match against stall name / description' }
    #swagger.parameters['cuisine'] = { in: 'query', required: false, type: 'string', description: 'Filter by cuisine type' }
  */
);
router.get("/:stallId/menu", optionalAuth, stallController.getStallMenu
  /*
    #swagger.tags = ['Stalls']
    #swagger.description = 'BED-62: Get a specific stall\'s menu items (dishes, prices, descriptions).'
  */
);
router.get("/:stallId/reviews/summary", optionalAuth, stallController.getStallReviewsSummary
  /*
    #swagger.tags = ['Stalls']
    #swagger.description = 'BED-85: Get the aggregated average rating, total review count, and most recent reviews for a stall.'
  */
);

module.exports = router;