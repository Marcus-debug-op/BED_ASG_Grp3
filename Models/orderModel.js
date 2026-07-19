const sql = require("mssql");
const dbConfig = require("../dbConfig");
// Added for promotion application/redemption (damien).
const promotionModel = require("./promotionModel");

// Creates an order and its line items as a single transaction (all-or-nothing).
// promoCode is optional - added for promotion application/redemption (damien).
async function createOrder(patronId, stallId, items, promoCode) {
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

    // ---------------------------------------------------------------
    // Promotion application (damien) - runs on the same transaction, so a
    // failed/invalid promo cancels the whole order just like an invalid item.
    // ---------------------------------------------------------------
    let finalAmount = totalAmount;
    let appliedPromotionId = null;
    let appliedDiscountAmount = null;

    if (promoCode) {
      const promoResult = await promotionModel.validateAndApplyPromotion(
        transaction,
        stallId,
        patronId,
        promoCode,
        totalAmount
      );

      if (!promoResult.valid) {
        await transaction.rollback();
        return { error: "PROMO_INVALID", reason: promoResult.reason, message: promoResult.message };
      }

      finalAmount = promoResult.discountedTotal;
      appliedPromotionId = promoResult.promotionId;
      appliedDiscountAmount = promoResult.discountAmount;
    }

    // Insert the master Orders row and get back its new order_id
    // (order_status defaults to 'Pending' in the table).
    const orderRequest = new sql.Request(transaction);
    orderRequest.input("patron_id", sql.Int, patronId);
    orderRequest.input("stall_id", sql.Int, stallId);
    orderRequest.input("total_amount", sql.Decimal(10, 2), finalAmount);
    orderRequest.input("promotion_id", sql.Int, appliedPromotionId);

    const orderResult = await orderRequest.query(`
      INSERT INTO Orders (patron_id, stall_id, total_amount, promotion_id)
      OUTPUT INSERTED.order_id, INSERTED.order_status, INSERTED.total_amount, INSERTED.order_date
      VALUES (@patron_id, @stall_id, @total_amount, @promotion_id);
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

    // Log the redemption (damien) - same transaction, so it commits/rolls
    // back together with the order it belongs to.
    if (appliedPromotionId) {
      await promotionModel.recordRedemption(transaction, appliedPromotionId, orderId, patronId, appliedDiscountAmount);
    }

    // Everything worked: commit and return the created order.
    await transaction.commit();
    return {
      order: newOrder,
      items: pricedItems,
      promotion: appliedPromotionId
        ? { promotion_id: appliedPromotionId, discount_amount: appliedDiscountAmount, subtotal: totalAmount }
        : null
    };

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

// Checkout-page "Apply" preview (BED-92) - answers "what would this code
// do to my cart right now?" WITHOUT creating an order or recording a
// redemption. Mirrors createOrder's own subtotal calculation (real prices
// from MenuItems, never the client's numbers) so the preview number is
// exactly what checkout would actually charge if submitted immediately
// afterwards, then reuses the same eligibility checks as a real checkout
// via promotionModel.previewPromotion.
async function previewPromo(patronId, stallId, items, promoCode) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    // Price the cart the same way createOrder does - server-side, from the
    // DB, one item at a time - so an invalid/unavailable item is caught
    // here too instead of surfacing only at real checkout.
    let subtotal = 0;
    for (const item of items) {
      const priceRequest = connection.request();
      priceRequest.input("menu_item_id", sql.Int, item.menu_item_id);
      priceRequest.input("stall_id", sql.Int, stallId);

      const priceResult = await priceRequest.query(`
        SELECT price
        FROM MenuItems
        WHERE menu_item_id = @menu_item_id
          AND stall_id = @stall_id
          AND is_available = 1;
      `);

      if (priceResult.recordset.length === 0) {
        return { error: "INVALID_ITEM", menuItemId: item.menu_item_id };
      }

      subtotal += priceResult.recordset[0].price * item.quantity;
    }

    const promoResult = await promotionModel.previewPromotion(connection, stallId, patronId, promoCode, subtotal);
    return { subtotal, ...promoResult };

  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Fetches one order's status. Also returns patron_id so the controller
// can confirm the requester actually owns this order.
async function getOrderStatus(orderId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("order_id", sql.Int, orderId);

    const result = await request.query(`
      SELECT order_id, patron_id, order_status, total_amount, order_date
      FROM Orders
      WHERE order_id = @order_id;
    `);

    return result.recordset[0] || null;   // null if no such order
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}


// Fetches all past orders for one patron, most recent first.
async function getOrderHistory(patronId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("patron_id", sql.Int, patronId);

    // Get this patron's orders, plus the stall name via a JOIN so the UI can show it.
    // ORDER BY newest first. If they have none, recordset is just an empty array.
    const result = await request.query(`
      SELECT o.order_id, o.stall_id, s.stall_name, o.order_status,
             o.total_amount, o.order_date
      FROM Orders o
      JOIN Stalls s ON o.stall_id = s.stall_id
      WHERE o.patron_id = @patron_id
      ORDER BY o.order_date DESC;
    `);

    return result.recordset;   // array of orders (empty [] if none)
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}



async function getOrdersForVendor(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);

    /*
      Retrieve all orders for stalls owned by this vendor.
      
      Orders table stores the order.
      Stalls table tells us which vendor owns the stall.
      Users table gives us the patron's name.
    */
    const result = await request.query(`
      SELECT 
        o.order_id,
        o.patron_id,
        u.full_name AS patron_name,
        o.stall_id,
        s.stall_name,
        o.order_status,
        o.total_amount,
        o.order_date
      FROM Orders o
      INNER JOIN Stalls s ON o.stall_id = s.stall_id
      INNER JOIN Users u ON o.patron_id = u.user_id
      WHERE s.vendor_id = @vendor_id
      ORDER BY o.order_date DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function getOrderDetailsForVendor(orderId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("order_id", sql.Int, orderId);
    request.input("vendor_id", sql.Int, vendorId);

    /*
      Retrieve one order's details.
      This joins:
      - Orders: main order info
      - Stalls: stall info and vendor ownership check
      - Users: patron info
      - OrderItems: items inside the order
      - MenuItems: menu item names
    */
    const result = await request.query(`
      SELECT 
        o.order_id,
        o.order_status,
        o.total_amount,
        o.order_date,
        u.full_name AS patron_name,
        s.stall_name,
        mi.item_name,
        oi.quantity,
        oi.unit_price,
        oi.subtotal
      FROM Orders o
      INNER JOIN Stalls s ON o.stall_id = s.stall_id
      INNER JOIN Users u ON o.patron_id = u.user_id
      INNER JOIN OrderItems oi ON o.order_id = oi.order_id
      INNER JOIN MenuItems mi ON oi.menu_item_id = mi.menu_item_id
      WHERE o.order_id = @order_id
        AND s.vendor_id = @vendor_id
      ORDER BY mi.item_name;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateOrderStatusForVendor(orderId, vendorId, orderStatus) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("order_id", sql.Int, orderId);
    request.input("vendor_id", sql.Int, vendorId);
    request.input("order_status", sql.VarChar(30), orderStatus);

    /*
      Update the order status only if:
      1. The order_id matches
      2. The order belongs to a stall owned by this vendor

      This prevents Vendor A from updating Vendor B's orders.
    */
    const result = await request.query(`
      UPDATE o
      SET o.order_status = @order_status
      OUTPUT 
        INSERTED.order_id,
        INSERTED.order_status,
        INSERTED.total_amount,
        INSERTED.order_date
      FROM Orders o
      INNER JOIN Stalls s ON o.stall_id = s.stall_id
      WHERE o.order_id = @order_id
        AND s.vendor_id = @vendor_id;
    `);

    return result.recordset[0] || null;
    }

    catch (error) {
    console.error("Database error:", error);
    throw error;
  } 
  finally {
    if (connection) await connection.close();
  }
}

// Fetches ONE order (with its stall name) and ALL of its line items from SQL Server.
// Returns { order, items }. order is null if the id doesn't exist.
// Fetches ONE order plus ALL of its line items.
// Returns { order, items }. order is null if the id doesn't exist.
// Two separate queries are used because one order has many items
// (a single JOIN would repeat the order header on every item row).
async function getOrderDetails(orderId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);

    // --- Query 1: the order header ---
    // Join Stalls to get the stall name. Also select patron_id so the CONTROLLER
    // can check ownership (it strips it out before sending to the user).
    const orderReq = connection.request();
    orderReq.input("order_id", sql.Int, orderId);
    const orderResult = await orderReq.query(`
      SELECT o.order_id, o.patron_id, o.stall_id, s.stall_name,
             o.order_status, o.total_amount, o.order_date
      FROM Orders o
      JOIN Stalls s ON o.stall_id = s.stall_id
      WHERE o.order_id = @order_id;
    `);

    const order = orderResult.recordset[0] || null;
    // If there's no such order, stop here — no point querying items.
    if (!order) return { order: null, items: [] };

    // --- Query 2: the line items for this order ---
    // Join MenuItems to get each dish's name. A fresh request() object is used
    // because a parameter (@order_id) can't be re-declared on the same request.
    const itemsReq = connection.request();
    itemsReq.input("order_id", sql.Int, orderId);
    const itemsResult = await itemsReq.query(`
      SELECT oi.order_item_id, oi.menu_item_id, m.item_name,
             oi.quantity, oi.unit_price, oi.subtotal
      FROM OrderItems oi
      JOIN MenuItems m ON oi.menu_item_id = m.menu_item_id
      WHERE oi.order_id = @order_id
      ORDER BY oi.order_item_id;
    `);

    return { order, items: itemsResult.recordset };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    // Always close the connection, whether it succeeded or failed.
    if (connection) await connection.close();
  }
} 

// Helped update functions
module.exports = {
  getOrderDetails,
  createOrder,
  previewPromo,
  getOrderStatus,
  getOrderHistory,
  getOrdersForVendor,
  getOrderDetailsForVendor,
  updateOrderStatusForVendor
};