const orderModel = require("../Models/orderModel");

// POST /api/orders -> create the order (validation handled by validateOrder middleware).
async function createOrder(req, res) {
  try {
    // Identify the patron from their token and read the validated order body.(damien)
    const patronId = req.user.sub;
    const { stall_id, items, promo_code } = req.body;

    // Create the order; the model flags an invalid/unavailable item.
    const result = await orderModel.createOrder(patronId, stall_id, items, promo_code);
    if (result.error === "INVALID_ITEM") {
      return res.status(400).json({ message: `Invalid or unavailable menu item: ${result.menuItemId}` });
    }
    // Added for promotion application/redemption (damien) - specific,
    // user-facing reasons a promo code was rejected.
    if (result.error === "PROMO_INVALID") {
      return res.status(400).json({ message: result.message, reason: result.reason });
    }

    // Success: 201 Created with the new order.
    res.status(201).json(result);

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Unable to create order." });
  }
}

// POST /api/orders/preview-promo -> BED-92. Lets the checkout page show the
// discount as soon as the patron clicks "Apply", instead of only after the
// whole order is submitted. Runs the exact same validation/discount math as
// a real checkout, but never creates an order or records a redemption, so
// it can be called freely (including re-clicking Apply, or trying a code
// against more than one stall in a multi-stall cart).
async function previewPromoCode(req, res) {
  try {
    const patronId = req.user.sub;
    const { stall_id, items, promo_code } = req.body;

    const result = await orderModel.previewPromo(patronId, stall_id, items, promo_code);

    if (result.error === "INVALID_ITEM") {
      return res.status(400).json({ message: `Invalid or unavailable menu item: ${result.menuItemId}` });
    }

    if (!result.valid) {
      // Same specific reasons as real checkout (NOT_FOUND, INACTIVE,
      // EXPIRED, MIN_SPEND_NOT_MET, ALREADY_REDEEMED, LIMIT_REACHED).
      return res.status(400).json({ message: result.message, reason: result.reason, subtotal: result.subtotal });
    }

    res.status(200).json({
      valid: true,
      subtotal: result.subtotal,
      discount_amount: result.discountAmount,
      discounted_total: result.discountedTotal,
      promotion_id: result.promotionId
    });
  } catch (error) {
    console.error("Error previewing promo code:", error);
    res.status(500).json({ message: "Unable to preview promo code." });
  }
}

// GET /api/orders/:id/status -> return the status of the patron's own order.
async function getOrderStatus(req, res) {
  try {
    // Parse and validate the id from the URL.
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "A valid numeric order id is required." });
    }

    // Look up the order.
    const order = await orderModel.getOrderStatus(orderId);

    // No such order -> 404.
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Authorization: the logged-in patron may only view their OWN order's status.
    const patronId = req.user.sub;
    if (order.patron_id !== patronId) {
      return res.status(403).json({ message: "You are not allowed to view this order." });
    }

    // Return the status (omit patron_id from the response — it was only for the check).
    res.status(200).json({
      order_id: order.order_id,
      order_status: order.order_status,
      total_amount: order.total_amount,
      order_date: order.order_date
    });
  } catch (error) {
    console.error("Error getting order status:", error);
    res.status(500).json({ message: "Unable to get order status." });
  }
}


// GET order history -> returns the logged-in patron's past orders.
async function getOrderHistory(req, res) {
  try {
    // Identify the patron from their token (same pattern as createOrder).
    const patronId = req.user.sub;
    const orders = await orderModel.getOrderHistory(patronId);
    // Always 200 — an empty history is a valid result, not an error (per the ticket).
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error getting order history:", error);
    res.status(500).json({ message: "Unable to get order history." });
  }
}


async function getVendorOrders(req, res) {
  try {
    //req.user.sub comes from the JWT token, sub stores the logged-in user's user_id.
    //Since this route is vendor-only, this user_id belongs to a vendor.
    
    const vendorId = req.user.sub;

    const orders = await orderModel.getOrdersForVendor(vendorId);

    res.status(200).json(orders);
  } catch (error) {
    console.error("Error getting vendor orders:", error);
    res.status(500).json({ message: "Unable to load vendor orders." });
  }
}

async function getVendorOrderDetails(req, res) {
  try {
    const vendorId = req.user.sub; //  Get logged-in vendor ID from token.
    const orderId = Number(req.params.orderId);// Get order ID fro  m the URL.

    if (Number.isNaN(orderId)) { //Validate that orderId is a proper number.
      return res.status(400).json({ message: "Invalid order ID." });
    }

    const orderDetails = await orderModel.getOrderDetailsForVendor(orderId, vendorId); // Retrieve full order details.

    if (orderDetails.length === 0) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json(orderDetails);
  } catch (error) {
    console.error("Error getting vendor order details:", error);
    res.status(500).json({ message: "Unable to load order details." });
  }
}

async function updateVendorOrderStatus(req, res) {
  try {

    const vendorId = req.user.sub; // Get logged-in vendor ID from token.
    const orderId = Number(req.params.orderId); // Get order ID from URL.
    const { order_status } = req.body;// Get new order status from frontend request body.

    const allowedStatuses = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"]; //only statuses vendors are allowed to set.

    // /Validate order ID & status.

    if (Number.isNaN(orderId)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }

    if (!allowedStatuses.includes(order_status)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    const updatedOrder = await orderModel.updateOrderStatusForVendor(
      orderId,
      vendorId,
      order_status
    );

    if (!updatedOrder) {
      return res.status(404).json({
        message: "Order not found or you do not own this stall."
      });
    }

    res.status(200).json({
      message: "Order status updated successfully.",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating vendor order status:", error);
    res.status(500).json({ message: "Unable to update order status." });
  }
}

// GET /api/orders/:id
// Returns a single order plus its line items, but only to the patron who owns it.
async function getOrderDetails(req, res) {
  try {
    // 1) Read the id from the URL and make sure it's a positive whole number.
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "A valid numeric order id is required." });
    }

    // 2) Ask the model for the order header + its items.
    const { order, items } = await orderModel.getOrderDetails(orderId);

    // 3) No such order -> 404.
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // 4) Ownership: a patron may only view their OWN order.
    //    req.user.sub is the logged-in patron's id (from their JWT token).
    const patronId = req.user.sub;
    if (order.patron_id !== patronId) {
      return res.status(403).json({ message: "You are not allowed to view this order." });
    }

    // 5) Success -> return the order summary + items.
    //    patron_id is left out of the response (it was only needed for the check).
    res.status(200).json({
      order: {
        order_id: order.order_id,
        stall_id: order.stall_id,
        stall_name: order.stall_name,
        order_status: order.order_status,
        total_amount: order.total_amount,
        order_date: order.order_date
      },
      items
    });
  } catch (error) {
    // Any unexpected DB/server error -> 500.
    console.error("Error getting order details:", error);
    res.status(500).json({ message: "Unable to get order details." });
  }
}

module.exports = {
  getOrderDetails,
  createOrder,
  previewPromoCode,
  getOrderStatus,
  getOrderHistory,
  getVendorOrders,
  getVendorOrderDetails,
  updateVendorOrderStatus
};