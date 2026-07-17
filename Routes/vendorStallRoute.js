const express = require("express");
const vendorStallController = require("../Controllers/vendorStallController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/my-stalls", requireRole("vendor"), vendorStallController.getMyStalls);

module.exports = router;