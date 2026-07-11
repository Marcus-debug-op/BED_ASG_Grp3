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

// BED-92: Fetch by feedback_id alone (ownership is checked in the controller,
// not the model - see feedbackController.updateFeedback/deleteFeedback for why).
async function getFeedbackById(feedbackId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("feedback_id", sql.Int, feedbackId);

    const result = await request.query(`
      SELECT feedback_id, patron_id, stall_id, rating, comment, created_at
      FROM Feedbacks
      WHERE feedback_id = @feedback_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// BED-92: Update own feedback. Caller (controller) has already confirmed
// ownership before calling this - the WHERE clause here is a second safety net.
async function updateFeedback(feedbackId, patronId, { stall_id, rating, comment }) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("feedback_id", sql.Int, feedbackId);
    request.input("patron_id", sql.Int, patronId);
    request.input("stall_id", sql.Int, stall_id);
    request.input("rating", sql.Int, rating);
    request.input("comment", sql.VarChar(500), comment || null);

    const result = await request.query(`
      UPDATE Feedbacks
      SET stall_id = @stall_id,
          rating = @rating,
          comment = @comment
      OUTPUT INSERTED.feedback_id, INSERTED.patron_id, INSERTED.stall_id,
             INSERTED.rating, INSERTED.comment, INSERTED.created_at
      WHERE feedback_id = @feedback_id AND patron_id = @patron_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// BED-92: Delete own feedback. Same "controller already checked ownership,
// WHERE clause is a second safety net" reasoning as updateFeedback above.
async function deleteFeedback(feedbackId, patronId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("feedback_id", sql.Int, feedbackId);
    request.input("patron_id", sql.Int, patronId);

    const result = await request.query(`
      DELETE FROM Feedbacks
      OUTPUT DELETED.feedback_id
      WHERE feedback_id = @feedback_id AND patron_id = @patron_id;
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
  createFeedback,
  getFeedbackForVendor,
  getFeedbackById,
  updateFeedback,
  deleteFeedback
};