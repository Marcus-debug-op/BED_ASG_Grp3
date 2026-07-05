const express = require("express");
const vendorStallController = require("../Controllers/vendorStallController");
const { requireAuth } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/my-stalls", requireAuth, vendorStallController.getMyStalls);

module.exports = router;