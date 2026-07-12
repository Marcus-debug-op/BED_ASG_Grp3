const sql = require("mssql");
const dbConfig = require("../dbConfig");

// BED-26: Menu item likes.
// The composite PK (user_id, menu_item_id) on UserLikesMenuItem is what
// strictly prevents a double-like - a second INSERT for the same pair throws
// SQL Server error 2627 (PK violation), which the controller catches.

// Also increments MenuItems.likes so existing reads (e.g. stallModel's menu
// query, which already SELECTs "likes") stay correct without a JOIN/COUNT.
async function likeItem(userId, menuItemId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const insertRequest = connection.request();
    insertRequest.input("user_id", sql.Int, userId);
    insertRequest.input("menu_item_id", sql.Int, menuItemId);

    await insertRequest.query(`
      INSERT INTO UserLikesMenuItem (user_id, menu_item_id)
      VALUES (@user_id, @menu_item_id);
    `);

    const updateRequest = connection.request();
    updateRequest.input("menu_item_id", sql.Int, menuItemId);

    const updateResult = await updateRequest.query(`
      UPDATE MenuItems
      SET likes = likes + 1
      OUTPUT INSERTED.menu_item_id, INSERTED.likes
      WHERE menu_item_id = @menu_item_id;
    `);

    return updateResult.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns null if the like didn't exist (nothing to unlike), otherwise the
// updated { menu_item_id, likes }.
async function unlikeItem(userId, menuItemId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const deleteRequest = connection.request();
    deleteRequest.input("user_id", sql.Int, userId);
    deleteRequest.input("menu_item_id", sql.Int, menuItemId);

    const deleteResult = await deleteRequest.query(`
      DELETE FROM UserLikesMenuItem
      OUTPUT DELETED.menu_item_id
      WHERE user_id = @user_id AND menu_item_id = @menu_item_id;
    `);

    if (deleteResult.recordset.length === 0) {
      return null;
    }

    const updateRequest = connection.request();
    updateRequest.input("menu_item_id", sql.Int, menuItemId);

    const updateResult = await updateRequest.query(`
      UPDATE MenuItems
      SET likes = CASE WHEN likes > 0 THEN likes - 1 ELSE 0 END
      OUTPUT INSERTED.menu_item_id, INSERTED.likes
      WHERE menu_item_id = @menu_item_id;
    `);

    return updateResult.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Public - GET /:id/likes/count. Returns null if the menu item doesn't exist.
async function getLikeCount(menuItemId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("menu_item_id", sql.Int, menuItemId);

    const result = await request.query(`
      SELECT menu_item_id, likes FROM MenuItems WHERE menu_item_id = @menu_item_id;
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
  likeItem,
  unlikeItem,
  getLikeCount
};
