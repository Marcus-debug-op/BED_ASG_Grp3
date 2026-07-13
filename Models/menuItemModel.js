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

// Attaches a cuisine_ids array (and cuisine_names, for display) to each menu item,
// using one extra query instead of a query-per-item.
async function attachCuisines(connection, items) {
  if (items.length === 0) return items;

  const ids = items.map((item) => item.menu_item_id);
  const request = connection.request();

  const idParams = ids.map((id, index) => {
    const paramName = `id${index}`;
    request.input(paramName, sql.Int, id);
    return `@${paramName}`;
  });

  const result = await request.query(`
    SELECT mic.menu_item_id, c.cuisine_id, c.cuisine_name
    FROM MenuItemCuisines mic
    INNER JOIN Cuisines c ON mic.cuisine_id = c.cuisine_id
    WHERE mic.menu_item_id IN (${idParams.join(", ")});
  `);

  const cuisinesByItem = new Map();
  for (const row of result.recordset) {
    if (!cuisinesByItem.has(row.menu_item_id)) cuisinesByItem.set(row.menu_item_id, []);
    cuisinesByItem.get(row.menu_item_id).push({ cuisine_id: row.cuisine_id, cuisine_name: row.cuisine_name });
  }

  return items.map((item) => ({
    ...item,
    cuisines: cuisinesByItem.get(item.menu_item_id) || []
  }));
}

// Replaces all of a menu item's cuisine links with the given list. Runs inside
// the caller's transaction so it either fully succeeds or rolls back with the rest.
async function syncMenuItemCuisines(transactionRequest, menuItemId, cuisineIds) {
  const deleteRequest = transactionRequest();
  deleteRequest.input("menu_item_id", sql.Int, menuItemId);
  await deleteRequest.query(`DELETE FROM MenuItemCuisines WHERE menu_item_id = @menu_item_id;`);

  for (const cuisineId of cuisineIds) {
    const insertRequest = transactionRequest();
    insertRequest.input("menu_item_id", sql.Int, menuItemId);
    insertRequest.input("cuisine_id", sql.Int, cuisineId);
    await insertRequest.query(`
      INSERT INTO MenuItemCuisines (menu_item_id, cuisine_id) VALUES (@menu_item_id, @cuisine_id);
    `);
  }
}

async function getAllCuisines() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    const result = await request.query(`
      SELECT cuisine_id, cuisine_name FROM Cuisines ORDER BY cuisine_name;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
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

    return await attachCuisines(connection, result.recordset);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// item.cuisine_ids is an optional array of Cuisine IDs (e.g. [1, 4] = Malay + Halal).
async function createMenuItem(stallId, vendorId, item) {
  let connection;
  let transaction;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return null;

    transaction = new sql.Transaction(connection);
    await transaction.begin();

    const insertRequest = new sql.Request(transaction);
    insertRequest.input("stall_id", sql.Int, stallId);
    insertRequest.input("item_name", sql.VarChar(100), item.item_name);
    insertRequest.input("description", sql.VarChar(255), item.description || null);
    insertRequest.input("price", sql.Decimal(10, 2), item.price);
    insertRequest.input("category", sql.VarChar(50), item.category || null);
    insertRequest.input("image_url", sql.VarChar(255), item.image_url || null);
    insertRequest.input("is_available", sql.Bit, item.is_available === undefined ? 1 : item.is_available);

    const insertResult = await insertRequest.query(`
      INSERT INTO MenuItems (stall_id, item_name, description, price, category, image_url, is_available)
      OUTPUT INSERTED.menu_item_id, INSERTED.stall_id, INSERTED.item_name, INSERTED.description,
             INSERTED.price, INSERTED.category, INSERTED.image_url, INSERTED.is_available, INSERTED.created_at
      VALUES (@stall_id, @item_name, @description, @price, @category, @image_url, @is_available);
    `);

    const created = insertResult.recordset[0];
    const cuisineIds = Array.isArray(item.cuisine_ids) ? item.cuisine_ids : [];

    await syncMenuItemCuisines(() => new sql.Request(transaction), created.menu_item_id, cuisineIds);

    await transaction.commit();

    const [withCuisines] = await attachCuisines(connection, [created]);
    return withCuisines;
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns null if the item doesn't exist or doesn't belong to this vendor's stalls.
async function updateMenuItem(menuItemId, vendorId, item) {
  let connection;
  let transaction;

  try {
    connection = await sql.connect(dbConfig);

    transaction = new sql.Transaction(connection);
    await transaction.begin();

    const updateRequest = new sql.Request(transaction);
    updateRequest.input("menu_item_id", sql.Int, menuItemId);
    updateRequest.input("vendor_id", sql.Int, vendorId);
    updateRequest.input("item_name", sql.VarChar(100), item.item_name);
    updateRequest.input("description", sql.VarChar(255), item.description || null);
    updateRequest.input("price", sql.Decimal(10, 2), item.price);
    updateRequest.input("category", sql.VarChar(50), item.category || null);
    updateRequest.input("image_url", sql.VarChar(255), item.image_url || null);
    updateRequest.input("is_available", sql.Bit, item.is_available === undefined ? 1 : item.is_available);

    const updateResult = await updateRequest.query(`
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

    const updated = updateResult.recordset[0];

    if (!updated) {
      await transaction.rollback();
      return null;
    }

    const cuisineIds = Array.isArray(item.cuisine_ids) ? item.cuisine_ids : [];
    await syncMenuItemCuisines(() => new sql.Request(transaction), menuItemId, cuisineIds);

    await transaction.commit();

    const [withCuisines] = await attachCuisines(connection, [updated]);
    return withCuisines;
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }
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

// MenuItemCuisines rows are cleaned up automatically via ON DELETE CASCADE.
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
  getAllCuisines,
  getMenuItemsByStall,
  createMenuItem,
  updateMenuItem,
  setMenuItemAvailability,
  deleteMenuItem
};