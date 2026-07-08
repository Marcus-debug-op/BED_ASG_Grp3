const express = require("express");
const orderController = require("../Controllers/orderController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateOrder } = require("../Middlewares/orderValidation");

const router = express.Router();

// Both order routes are restricted to logged-in patrons.
router.post("/", requireRole("patron"), validateOrder, orderController.createOrder);
router.get("/:id/status", requireRole("patron"), orderController.getOrderStatus);

module.exports = router;