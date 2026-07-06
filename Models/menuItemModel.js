const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Confirms the given stall belongs to the given vendor before any write/read happens.
async function stallBelongsToVendor(connection, stallId, vendorId) {
  const request = connection.request();
  request.input("stall_id", sql.Int, stallId);
  request.input("vendor_id", sql.Int, vendorId);

  const result = await request.query(`
    SELECT stall_id FROM Stalls WHERE stall_id = @stall_id AND vendor_id = @vendor_id;
  `);

  return result.recordset.length > 0;
}

// Returns null if the stall doesn't belong to this vendor, so the controller can 403.
async function getMenuItemsByStall(stallId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return null;

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      SELECT menu_item_id, stall_id, item_name, description, price, category, image_url, is_available, created_at
      FROM MenuItems
      WHERE stall_id = @stall_id
      ORDER BY category, item_name;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function createMenuItem(stallId, vendorId, item) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return null;

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("item_name", sql.VarChar(100), item.item_name);
    request.input("description", sql.VarChar(255), item.description || null);
    request.input("price", sql.Decimal(10, 2), item.price);
    request.input("category", sql.VarChar(50), item.category || null);
    request.input("image_url", sql.VarChar(255), item.image_url || null);
    request.input("is_available", sql.Bit, item.is_available === undefined ? 1 : item.is_available);

    const result = await request.query(`
      INSERT INTO MenuItems (stall_id, item_name, description, price, category, image_url, is_available)
      OUTPUT INSERTED.menu_item_id, INSERTED.stall_id, INSERTED.item_name, INSERTED.description,
             INSERTED.price, INSERTED.category, INSERTED.image_url, INSERTED.is_available, INSERTED.created_at
      VALUES (@stall_id, @item_name, @description, @price, @category, @image_url, @is_available);
    `);

    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns null if the item doesn't exist or doesn't belong to this vendor's stalls.
async function updateMenuItem(menuItemId, vendorId, item) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("menu_item_id", sql.Int, menuItemId);
    request.input("vendor_id", sql.Int, vendorId);
    request.input("item_name", sql.VarChar(100), item.item_name);
    request.input("description", sql.VarChar(255), item.description || null);
    request.input("price", sql.Decimal(10, 2), item.price);
    request.input("category", sql.VarChar(50), item.category || null);
    request.input("image_url", sql.VarChar(255), item.image_url || null);
    request.input("is_available", sql.Bit, item.is_available === undefined ? 1 : item.is_available);

    const result = await request.query(`
      UPDATE m
      SET item_name = @item_name,
          description = @description,
          price = @price,
          category = @category,
          image_url = @image_url,
          is_available = @is_available
      OUTPUT INSERTED.menu_item_id, INSERTED.stall_id, INSERTED.item_name, INSERTED.description,
             INSERTED.price, INSERTED.category, INSERTED.image_url, INSERTED.is_available, INSERTED.created_at
      FROM MenuItems m
      INNER JOIN Stalls s ON m.stall_id = s.stall_id
      WHERE m.menu_item_id = @menu_item_id AND s.vendor_id = @vendor_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Lightweight endpoint for the common "86 this item" / "back in stock" toggle.
async function setMenuItemAvailability(menuItemId, vendorId, isAvailable) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("menu_item_id", sql.Int, menuItemId);
    request.input("vendor_id", sql.Int, vendorId);
    request.input("is_available", sql.Bit, isAvailable);

    const result = await request.query(`
      UPDATE m
      SET is_available = @is_available
      OUTPUT INSERTED.menu_item_id, INSERTED.stall_id, INSERTED.is_available
      FROM MenuItems m
      INNER JOIN Stalls s ON m.stall_id = s.stall_id
      WHERE m.menu_item_id = @menu_item_id AND s.vendor_id = @vendor_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function deleteMenuItem(menuItemId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("menu_item_id", sql.Int, menuItemId);
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      DELETE m
      OUTPUT DELETED.menu_item_id
      FROM MenuItems m
      INNER JOIN Stalls s ON m.stall_id = s.stall_id
      WHERE m.menu_item_id = @menu_item_id AND s.vendor_id = @vendor_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getMenuItemsByStall,
  createMenuItem,
  updateMenuItem,
  setMenuItemAvailability,
  deleteMenuItem
};