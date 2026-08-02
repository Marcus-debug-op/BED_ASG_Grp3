const express = require("express");
const hawkerCentreController = require("../Controllers/hawkerCentreController");
const { optionalAuth } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get(
  "/",
  optionalAuth,
  hawkerCentreController.getAllHawkerCentres
  /*
    #swagger.tags = ['Public - Hawker Centres']
    #swagger.summary = 'List hawker centres'
    #swagger.description = 'Returns all available hawker centres.'
  */
);

module.exports = router;