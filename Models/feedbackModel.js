const sql = require("mssql");
const dbConfig = require("../dbConfig");

// BED-2: Patron submits feedback for a stall.
// No pre-check on stall_id existing - we let the FK constraint fail and the
// controller catches error.number === 547 (same pattern as menuItemController.deleteMenuItem).
async function createFeedback(patronId, { stall_id, rating, comment }) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("patron_id", sql.Int, patronId);
    request.input("stall_id", sql.Int, stall_id);
    request.input("rating", sql.Int, rating);
    request.input("comment", sql.VarChar(500), comment || null);

    const result = await request.query(`
      INSERT INTO Feedbacks (patron_id, stall_id, rating, comment)
      OUTPUT INSERTED.feedback_id, INSERTED.patron_id, INSERTED.stall_id,
             INSERTED.rating, INSERTED.comment, INSERTED.created_at
      VALUES (@patron_id, @stall_id, @rating, @comment);
    `);

    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// BED-2: Vendor reads feedback, restricted to stalls they own.
// The INNER JOIN on Stalls WHERE s.vendor_id = @vendor_id is what makes this
// role-restricted - a vendor physically cannot see rows outside their own stalls.
async function getFeedbackForVendor(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      SELECT f.*
      FROM Feedbacks f
      INNER JOIN Stalls s ON f.stall_id = s.stall_id
      WHERE s.vendor_id = @vendor_id
      ORDER BY f.created_at DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  createFeedback,
  getFeedbackForVendor,
};