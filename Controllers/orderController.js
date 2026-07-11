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

// GET /api/vendor/orders/stall/:stallId -> list all orders (with items) for the vendor's stall.
async function getStallOrders(req, res) {
  try {
    const vendorId = req.user.sub;
    const stallId = Number(req.params.stallId);

    const rows = await orderModel.getOrdersByStall(stallId, vendorId);

    if (rows === null) {
      return res.status(403).json({ message: "You do not own this stall." });
    }

    // Rows come back one-per-order-line (LEFT JOIN); group them into one entry per order.
    const ordersById = new Map();

    for (const row of rows) {
      if (!ordersById.has(row.order_id)) {
        ordersById.set(row.order_id, {
          order_id: row.order_id,
          order_status: row.order_status,
          total_amount: row.total_amount,
          order_date: row.order_date,
          customer_name: row.customer_name,
          items: []
        });
      }

      if (row.menu_item_id !== null) {
        ordersById.get(row.order_id).items.push({
          menu_item_id: row.menu_item_id,
          item_name: row.item_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
          subtotal: row.subtotal
        });
      }
    }

    res.status(200).json(Array.from(ordersById.values()));
  } catch (error) {
    console.error("Error getting stall orders:", error);
    res.status(500).json({ message: "Unable to load orders." });
  }
}

// PATCH /api/vendor/orders/:id/status -> advance an order's workflow status.
async function updateOrderStatus(req, res) {
  try {
    const vendorId = req.user.sub;
    const orderId = Number(req.params.id);
    const { order_status } = req.body;

    const updated = await orderModel.updateOrderStatus(orderId, vendorId, order_status);

    if (!updated) {
      return res.status(404).json({ message: "Order not found." });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Unable to update order status." });
  }
}

module.exports = { createOrder, getOrderStatus, getStallOrders, updateOrderStatus };