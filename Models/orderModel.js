const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Creates an order and its line items as a single transaction (all-or-nothing).
async function createOrder(patronId, stallId, items) {
  let connection;
  let transaction;

  try {
    connection = await sql.connect(dbConfig);
    transaction = new sql.Transaction(connection);
    await transaction.begin();

    // Look up each item's real price from the database (never trust the client),
    // build the priced line list, and total up the order server-side.
    let totalAmount = 0;
    const pricedItems = [];

    for (const item of items) {
      const priceRequest = new sql.Request(transaction);
      priceRequest.input("menu_item_id", sql.Int, item.menu_item_id);
      priceRequest.input("stall_id", sql.Int, stallId);

      const priceResult = await priceRequest.query(`
        SELECT price
        FROM MenuItems
        WHERE menu_item_id = @menu_item_id
          AND stall_id = @stall_id
          AND is_available = 1;
      `);

      // Item not found for this stall / unavailable: cancel the whole order.
      if (priceResult.recordset.length === 0) {
        await transaction.rollback();
        return { error: "INVALID_ITEM", menuItemId: item.menu_item_id };
      }

      const unitPrice = priceResult.recordset[0].price;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      pricedItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: subtotal
      });
    }

    // Insert the master Orders row and get back its new order_id
    // (order_status defaults to 'Pending' in the table).
    const orderRequest = new sql.Request(transaction);
    orderRequest.input("patron_id", sql.Int, patronId);
    orderRequest.input("stall_id", sql.Int, stallId);
    orderRequest.input("total_amount", sql.Decimal(10, 2), totalAmount);

    const orderResult = await orderRequest.query(`
      INSERT INTO Orders (patron_id, stall_id, total_amount)
      OUTPUT INSERTED.order_id, INSERTED.order_status, INSERTED.total_amount, INSERTED.order_date
      VALUES (@patron_id, @stall_id, @total_amount);
    `);

    const newOrder = orderResult.recordset[0];
    const orderId = newOrder.order_id;

    // Insert one OrderItems row per line, all linked to the new order_id.
    for (const line of pricedItems) {
      const lineRequest = new sql.Request(transaction);
      lineRequest.input("order_id", sql.Int, orderId);
      lineRequest.input("menu_item_id", sql.Int, line.menu_item_id);
      lineRequest.input("quantity", sql.Int, line.quantity);
      lineRequest.input("unit_price", sql.Decimal(10, 2), line.unit_price);
      lineRequest.input("subtotal", sql.Decimal(10, 2), line.subtotal);

      await lineRequest.query(`
        INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal)
        VALUES (@order_id, @menu_item_id, @quantity, @unit_price, @subtotal);
      `);
    }

    // Everything worked: commit and return the created order.
    await transaction.commit();
    return { order: newOrder, items: pricedItems };

  } catch (error) {
    // On any failure, roll back so no partial order is left behind.
    if (transaction) {
      try { await transaction.rollback(); } catch (e) { /* already rolled back */ }
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Reads a single order's status (returns null if it doesn't exist).
async function getOrderStatus(orderId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("order_id", sql.Int, orderId);

    const result = await request.query(`
      SELECT order_id, order_status, total_amount, order_date
      FROM Orders
      WHERE order_id = @order_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { createOrder, getOrderStatus };