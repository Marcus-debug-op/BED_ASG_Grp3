const express = require("express");
const stallController = require("../Controllers/stallController");
const { optionalAuth } = require("../Middlewares/authMiddleware");

const router = express.Router();

// Public browsing routes - guests and patrons can both view stalls/menus,
// so this uses optionalAuth (same pattern as hawkerCentreRoute) rather than requireAuth.
router.get("/", optionalAuth, stallController.getStalls);

module.exports = router;