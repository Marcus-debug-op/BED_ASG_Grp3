const express = require("express");
const hawkerCentreController = require("../Controllers/hawkerCentreController");
const { optionalAuth } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get(
  "/",
  optionalAuth,
  hawkerCentreController.getAllHawkerCentres
);

module.exports = router;