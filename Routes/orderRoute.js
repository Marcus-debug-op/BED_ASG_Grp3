const express = require("express");
const orderController = require("../Controllers/orderController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateOrder } = require("../Middlewares/orderValidation");

const router = express.Router();

// Both order routes are restricted to logged-in patrons.
router.post("/", requireRole("patron"), validateOrder, orderController.createOrder);
// Patron's past orders. Must come BEFORE "/:id/status" so "history" isn't
// mistaken for an :id value.
router.get("/history", requireRole("patron"), orderController.getOrderHistory);
router.get("/:id/status", requireRole("patron"), orderController.getOrderStatus);

module.exports = router;