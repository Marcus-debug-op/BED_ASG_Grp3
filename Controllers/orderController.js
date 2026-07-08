const orderModel = require("../Models/orderModel");

// POST /api/orders -> validate the request, then create the order.
async function createOrder(req, res) {
  try {
    // Identify the patron from their token and read the order from the body.
    const patronId = req.user.sub;
    const { stall_id, items } = req.body;

    // Reject requests with no stall or an empty items array.
    if (!stall_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "stall_id and a non-empty items array are required." });
    }

    // Reject any line missing an id or with a non-positive quantity.
    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ message: "Each item needs a valid menu_item_id and quantity > 0." });
      }
    }

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

// GET /api/orders/:id/status -> return one order's status, or 404.
async function getOrderStatus(req, res) {
  try {
    const orderId = Number(req.params.id);
    const order = await orderModel.getOrderStatus(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error getting order status:", error);
    res.status(500).json({ message: "Unable to get order status." });
  }
}

module.exports = { createOrder, getOrderStatus };