const express = require("express");
const orderController = require("../Controllers/orderController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateOrder, validatePromoPreview } = require("../Middlewares/orderValidation");

const router = express.Router();

// vendor routes

/* READ vendor orders. Vendor uses this route to retrieve all orders from stalls they own.
  The backend uses req.user.sub from the JWT token to know which vendor is logged in.*/
router.get("/vendor/my-orders", requireRole("vendor"), orderController.getVendorOrders
/*
    #swagger.tags = ['Vendor - Orders']
    #swagger.description = 'Vendor retrieves orders from stalls they own'
    #swagger.security = [{ "bearerAuth": [] }]
  */
 );

/* READ one vendor order details. Vendor uses this route to view the items inside a specific order.
  This also checks that the order belongs to the vendor's stall. */
router.get("/vendor/my-orders/:orderId", requireRole("vendor"), orderController.getVendorOrderDetails
  /*
    #swagger.tags = ['Vendor - Orders']
    #swagger.description = 'Vendor retrieves details of one order from their own stall'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['orderId'] = {
      in: 'path',
      required: true,
      type: 'integer',
      description: 'Order ID'
    }
  */
);

/*UPDATE order status. Vendor uses this route to update the order status.*/
router.put("/vendor/my-orders/:orderId/status", requireRole("vendor"), orderController.updateVendorOrderStatus
 /*
    #swagger.tags = ['Vendor - Orders']
    #swagger.description = 'Vendor updates the status of an order from their own stall'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['orderId'] = {
      in: 'path',
      required: true,
      type: 'integer',
      description: 'Order ID'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        order_status: 'Preparing'
      }
    }
    #swagger.responses[200] = {
      description: 'Order status updated successfully'
    }
    #swagger.responses[400] = {
      description: 'Invalid order ID or invalid order status'
    }
    #swagger.responses[403] = {
      description: 'Vendor does not have permission'
    }
    #swagger.responses[404] = {
      description: 'Order not found or vendor does not own this stall'
    }
  */
);


// Both order routes are restricted to logged-in patrons.
router.post("/", requireRole("patron"), validateOrder, orderController.createOrder
/*
  #swagger.tags = ['Patron - Orders']
  #swagger.description = 'Patron creates an order for a single stall. If a promo_code is supplied, the backend validates its active status, expiry date and minimum spend, calculates the exact discount server-side, applies it to the order total, and records a redemption linked to this order - preventing the same code from being reused. Invalid/expired/ineligible codes return a clear error reason instead of failing the order.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

// Patron previews a promo code against their current cart BEFORE submitting
// the order, so the checkout page can show the discount as soon as they
// click "Apply" instead of only after the order goes through. Runs the same
// validation/discount math as the real checkout, but never creates an order
// or records a redemption.
router.post("/preview-promo", requireRole("patron"), validatePromoPreview, orderController.previewPromoCode
/*
  #swagger.tags = ['Patron - Orders']
  #swagger.description = 'Patron previews what a promo code would do to their current cart (for one stall) without submitting an order. Returns the same validation reasons as order creation (NOT_FOUND, INACTIVE, EXPIRED, MIN_SPEND_NOT_MET, ALREADY_REDEEMED, LIMIT_REACHED) if invalid, or the calculated discount if valid. No order is created and no redemption is recorded.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

// Patron's past orders. Must come BEFORE "/:id/status" so "history" isn't
// mistaken for an :id value.
router.get("/history", requireRole("patron"), orderController.getOrderHistory
/*
    #swagger.tags = ['Patron - Orders']
    #swagger.description = "Patron retrieves their own past orders, newest first"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

// ============================================================================
// GET /api/orders/checkout/:checkoutId
// Returns all orders sharing one checkout id (the combined receipt data).
//
// IMPORTANT - route order: this MUST be declared before the "/:id" route.
// Express matches routes top-to-bottom, so if "/:id" came first, the word
// "checkout" would be read as an :id value and never reach this handler.
// ============================================================================
router.get("/checkout/:checkoutId", requireRole("patron"), orderController.getOrdersByCheckout
/*
    #swagger.tags = ['Patron - Orders']
    #swagger.description = "Patron retrieves all their orders that share one checkout id (combined receipt)"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

router.get("/:id/status", requireRole("patron"), orderController.getOrderStatus
/*
    #swagger.tags = ['Patron - Orders']
    #swagger.description = "Patron retrieves the status of one of their own orders"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

// One of the patron's own orders, WITH its line items.
// This is ONE segment ("/:id"), so it MUST be placed AFTER "/history" and
// "/:id/status" — otherwise Express would treat the word "history" as an :id.
router.get("/:id", requireRole("patron"), orderController.getOrderDetails
/*
    #swagger.tags = ['Patron - Orders']
    #swagger.description = "Patron retrieves one of their own orders with its line items"
    #swagger.security = [{ "bearerAuth": [] }]
  */);

module.exports = router;