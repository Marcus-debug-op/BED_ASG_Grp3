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

//vendor routes

/* READ vendor orders. Vendor uses this route to retrieve all orders from stalls they own.
  The backend uses req.user.sub from the JWT token to know which vendor is logged in.*/
router.get("/vendor/my-orders", requireRole("vendor"), orderController.getVendorOrders);

/* READ one vendor order details. Vendor uses this route to view the items inside a specific order.
  This also checks that the order belongs to the vendor's stall. */
router.get("/vendor/my-orders/:orderId", requireRole("vendor"), orderController.getVendorOrderDetails);


/*UPDATE order status. Vendor uses this route to update the order status.*/
router.put("/vendor/my-orders/:orderId/status", requireRole("vendor"), orderController.updateVendorOrderStatus);

module.exports = router;