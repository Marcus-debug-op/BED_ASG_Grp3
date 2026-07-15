const express = require("express");
const orderController = require("../Controllers/orderController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateOrderStatus } = require("../Middlewares/orderValidation");

const router = express.Router();

// Vendor-only: view orders placed at your own stall, and advance their workflow status.
router.get("/stall/:stallId", requireRole("vendor"), orderController.getStallOrders);
router.patch("/:id/status", requireRole("vendor"), validateOrderStatus, orderController.updateOrderStatus);

module.exports = router;
