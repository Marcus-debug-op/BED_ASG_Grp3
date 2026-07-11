const orderModel = require("../Models/orderModel");

// POST /api/orders -> create the order (validation handled by validateOrder middleware).
async function createOrder(req, res) {
  try {
    // Identify the patron from their token and read the validated order body.
    const patronId = req.user.sub;
    const { stall_id, items } = req.body;

    // Create the order; the model flags an invalid/unavailable item.
    const result = await orderModel.createOrder(patronId, stall_id, items);
    if (result.error === "INVALID_ITEM") {
      return res.status(400).json({ message: `Invalid or unavailable menu item: ${result.menuItemId}` });
    }

    // Success: 201 Created with the new order.
    res.status(201).json(result);

  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Unable to create order." });
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

module.exports = { createOrder, getOrderStatus };