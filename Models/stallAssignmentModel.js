const sql = require("mssql");
const dbConfig = require("../dbConfig");

// ============================================================================
// BED-145 (Ryan Tan): Vendor Assignment model.
//
// Connection handling mirrors the existing models (orderModel.js,
// operatorStallModel.js) EXACTLY: each function does its own
// `let connection; try { connection = await sql.connect(dbConfig); ... }
// finally { if (connection) await connection.close(); }`.
// This keeps behaviour consistent with the rest of the app and avoids the
// ENOTOPEN error that came from acquiring/closing the pool inconsistently.
// ============================================================================

// Does a stall with this id exist? (We reference Stalls but never modify it.)
async function stallExists(stallId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    const result = await request.query(
      `SELECT stall_id FROM Stalls WHERE stall_id = @stall_id;`
    );
    return result.recordset.length > 0;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Is this user id a real vendor? Guards against assigning to a non-vendor.
async function isVendor(vendorId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);
    const result = await request.query(
      `SELECT user_id FROM Users WHERE user_id = @vendor_id AND role = 'vendor';`
    );
    return result.recordset.length > 0;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// The current (un-vacated) assignment for a stall, or null if unoccupied.
async function getCurrentAssignment(stallId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    const result = await request.query(`
      SELECT a.assignment_id, a.stall_id, a.vendor_id, a.assigned_date,
             u.full_name AS vendor_name, u.email AS vendor_email
      FROM StallVendorAssignments a
      JOIN Users u ON u.user_id = a.vendor_id
      WHERE a.stall_id = @stall_id AND a.vacated_date IS NULL;
    `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Every stall's current occupant (one row per currently-occupied stall).
async function getAllCurrentAssignments() {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    const result = await request.query(`
      SELECT a.assignment_id, a.stall_id, s.stall_name, a.vendor_id,
             u.full_name AS vendor_name, u.email AS vendor_email, a.assigned_date
      FROM StallVendorAssignments a
      JOIN Stalls s ON s.stall_id = a.stall_id
      JOIN Users  u ON u.user_id = a.vendor_id
      WHERE a.vacated_date IS NULL
      ORDER BY a.stall_id;
    `);
    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Full assignment history for one stall, newest first.
async function getAssignmentHistory(stallId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    const result = await request.query(`
      SELECT a.assignment_id, a.stall_id, a.vendor_id,
             u.full_name AS vendor_name, a.assigned_date, a.vacated_date
      FROM StallVendorAssignments a
      JOIN Users u ON u.user_id = a.vendor_id
      WHERE a.stall_id = @stall_id
      ORDER BY a.assigned_date DESC, a.assignment_id DESC;
    `);
    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Assign (or reassign) a vendor to a stall.
//   - occupied by same vendor        -> { error: "ALREADY_ASSIGNED_TO_SAME_VENDOR" }
//   - occupied, allowReassign=false  -> { error: "CONFLICT", currentVendorId }
//   - occupied, allowReassign=true   -> vacate current, then assign new
// Uses a transaction so the vacate + insert are atomic. The transaction is
// built from the shared connection; the pool is closed once in finally (same
// as every other function) - never mid-transaction, which is what caused
// ENOTOPEN before.
async function assignVendor(stallId, vendorId, operatorId, allowReassign) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const transaction = new sql.Transaction(connection);
    await transaction.begin();

    try {
      // Lock the current assignment row (if any) while we decide.
      const currentReq = new sql.Request(transaction);
      currentReq.input("stall_id", sql.Int, stallId);
      const current = await currentReq.query(`
        SELECT assignment_id, vendor_id
        FROM StallVendorAssignments WITH (UPDLOCK, HOLDLOCK)
        WHERE stall_id = @stall_id AND vacated_date IS NULL;
      `);
      const existing = current.recordset[0];

      if (existing) {
        if (existing.vendor_id === vendorId) {
          await transaction.rollback();
          return { error: "ALREADY_ASSIGNED_TO_SAME_VENDOR" };
        }
        if (!allowReassign) {
          await transaction.rollback();
          return { error: "CONFLICT", currentVendorId: existing.vendor_id };
        }
        const vacateReq = new sql.Request(transaction);
        vacateReq.input("assignment_id", sql.Int, existing.assignment_id);
        await vacateReq.query(`
          UPDATE StallVendorAssignments SET vacated_date = GETDATE()
          WHERE assignment_id = @assignment_id;
        `);
      }

      const insertReq = new sql.Request(transaction);
      insertReq.input("stall_id", sql.Int, stallId);
      insertReq.input("vendor_id", sql.Int, vendorId);
      insertReq.input("assigned_by", sql.Int, operatorId || null);
      const inserted = await insertReq.query(`
        INSERT INTO StallVendorAssignments (stall_id, vendor_id, assigned_by)
        OUTPUT INSERTED.assignment_id, INSERTED.stall_id, INSERTED.vendor_id, INSERTED.assigned_date
        VALUES (@stall_id, @vendor_id, @assigned_by);
      `);

      await transaction.commit();
      return inserted.recordset[0];
    } catch (innerError) {
      try { await transaction.rollback(); } catch (_) { /* already rolled back */ }
      throw innerError;
    }
  } catch (error) {
    if (error.number === 547) return { error: "INVALID_REFERENCE" };
    if (error.number === 2627 || error.number === 2601) return { error: "CONFLICT" };
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Vacate (unassign) whoever currently occupies a stall. Returns the vacated
// row, or null if the stall had no current occupant.
async function vacateStall(stallId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    const result = await request.query(`
      UPDATE StallVendorAssignments SET vacated_date = GETDATE()
      OUTPUT INSERTED.assignment_id, INSERTED.stall_id, INSERTED.vendor_id, INSERTED.vacated_date
      WHERE stall_id = @stall_id AND vacated_date IS NULL;
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
  stallExists,
  isVendor,
  getCurrentAssignment,
  getAllCurrentAssignments,
  getAssignmentHistory,
  assignVendor,
  vacateStall
};