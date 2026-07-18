const express = require("express");
const orderController = require("../Controllers/orderController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateOrder } = require("../Middlewares/orderValidation");

const router = express.Router();

// vendor routes

/* READ vendor orders. Vendor uses this route to retrieve all orders from stalls they own.
  The backend uses req.user.sub from the JWT token to know which vendor is logged in.*/
router.get("/vendor/my-orders", requireRole("vendor"), orderController.getVendorOrders
/*
    #swagger.tags = ['Orders']
    #swagger.description = 'Vendor retrieves orders from stalls they own'
    #swagger.security = [{ "bearerAuth": [] }]
  */);

/* READ one vendor order details. Vendor uses this route to view the items inside a specific order.
  This also checks that the order belongs to the vendor's stall. */
router.get("/vendor/my-orders/:orderId", requireRole("vendor"), orderController.getVendorOrderDetails);

/* UPDATE order status. Vendor uses this route to update the order status.*/
router.put("/vendor/my-orders/:orderId/status", requireRole("vendor"), orderController.updateVendorOrderStatus);


// Both order routes are restricted to logged-in patrons.
router.post("/", requireRole("patron"), validateOrder, orderController.createOrder
/*
  #swagger.tags = ['Orders']
  #swagger.description = 'Patron creates an order for a single stall. If a promo_code is supplied, the backend validates its active status, expiry date and minimum spend, calculates the exact discount server-side, applies it to the order total, and records a redemption linked to this order - preventing the same code from being reused. Invalid/expired/ineligible codes return a clear error reason instead of failing the order.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

// Patron's past orders. Must come BEFORE "/:id/status" so "history" isn't
// mistaken for an :id value.
router.get("/history", requireRole("patron"), orderController.getOrderHistory
/*
    #swagger.tags = ['Orders']
    #swagger.description = "Patron retrieves their own past orders, newest first"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

router.get("/:id/status", requireRole("patron"), orderController.getOrderStatus
/*
    #swagger.tags = ['Orders']
    #swagger.description = "Patron retrieves the status of one of their own orders"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

// One of the patron's own orders, WITH its line items.
// This is ONE segment ("/:id"), so it MUST be placed AFTER "/history" and
// "/:id/status" — otherwise Express would treat the word "history" as an :id.
router.get("/:id", requireRole("patron"), orderController.getOrderDetails
/*
    #swagger.tags = ['Orders']
    #swagger.description = "Patron retrieves one of their own orders with its line items"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

module.exports = router;