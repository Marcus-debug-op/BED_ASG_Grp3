const sql = require("mssql");
const dbConfig = require("../dbConfig");

const VALID_STATUSES = ["Open", "Acknowledged", "In Progress", "Resolved", "Closed"];
const RESOLVED_STATUSES = ["Resolved", "Closed"];

// Routing rule: Hygiene complaints go to an officer (matches their real
// inspection/grading authority per the case study); every other complaint
// type (Service, Food Quality, Overcharging, Other) goes to an operator,
// who is responsible for day-to-day stall/vendor management instead.
const HYGIENE_TYPE = "Hygiene";

function requiredRoleForType(complaintType) {
  return complaintType === HYGIENE_TYPE ? "officer" : "operator";
}

// Supports optional filtering by status and/or vendor_id (via the stall the
// complaint was made against), plus an optional typeScope ("hygiene" | "other")
// that restricts results to the complaint types a given staff role may handle.
async function getComplaints(filters) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("status", sql.VarChar(30), filters.status || null);
    request.input("vendor_id", sql.Int, filters.vendorId || null);

    let typeClause = "";
    if (filters.typeScope === "hygiene") {
      typeClause = "AND c.complaint_type = 'Hygiene'";
    } else if (filters.typeScope === "other") {
      typeClause = "AND c.complaint_type <> 'Hygiene'";
    }

    const result = await request.query(`
      SELECT c.complaint_id, c.complaint_type, c.description, c.complaint_status,
             c.created_at, c.resolved_at,
             c.patron_id, u.full_name AS patron_name,
             c.stall_id, s.stall_name, s.vendor_id,
             c.handled_by_officer_id, o.full_name AS officer_name
      FROM Complaints c
      INNER JOIN Users u ON c.patron_id = u.user_id
      LEFT JOIN Stalls s ON c.stall_id = s.stall_id
      LEFT JOIN Users o ON c.handled_by_officer_id = o.user_id
      WHERE (@status IS NULL OR c.complaint_status = @status)
        AND (@vendor_id IS NULL OR s.vendor_id = @vendor_id)
        ${typeClause}
      ORDER BY c.created_at DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns null if no complaint with this ID exists.
async function getComplaintById(complaintId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("complaint_id", sql.Int, complaintId);

    const complaintResult = await request.query(`
      SELECT c.complaint_id, c.complaint_type, c.description, c.complaint_status,
             c.created_at, c.resolved_at,
             c.patron_id, u.full_name AS patron_name, u.email AS patron_email,
             c.stall_id, s.stall_name, s.vendor_id,
             c.handled_by_officer_id, o.full_name AS officer_name
      FROM Complaints c
      INNER JOIN Users u ON c.patron_id = u.user_id
      LEFT JOIN Stalls s ON c.stall_id = s.stall_id
      LEFT JOIN Users o ON c.handled_by_officer_id = o.user_id
      WHERE c.complaint_id = @complaint_id;
    `);

    const complaint = complaintResult.recordset[0];
    if (!complaint) return null;

    const notesRequest = connection.request();
    notesRequest.input("complaint_id", sql.Int, complaintId);

    const notesResult = await notesRequest.query(`
      SELECT n.complaint_note_id, n.officer_id, o.full_name AS officer_name, n.note, n.created_at
      FROM ComplaintNotes n
      INNER JOIN Users o ON n.officer_id = o.user_id
      WHERE n.complaint_id = @complaint_id
      ORDER BY n.created_at ASC;
    `);

    return { ...complaint, notes: notesResult.recordset };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Updates status (and assigns the acting officer/operator as the handler) and,
// if a note was given, appends it as a new ComplaintNotes row - both inside one
// transaction so a note is never saved against a status change that failed.
// Returns null if the complaint doesn't exist.
// (actorId is stored in the handled_by_officer_id column regardless of
// whether the actor is an officer or an operator - the column name predates
// the operator role being added, but both are just Users.user_id underneath.)
async function updateComplaintStatus(complaintId, actorId, status, note) {
  let connection;
  let transaction;

  try {
    connection = await sql.connect(dbConfig);

    transaction = new sql.Transaction(connection);
    await transaction.begin();

    const updateRequest = new sql.Request(transaction);
    updateRequest.input("complaint_id", sql.Int, complaintId);
    updateRequest.input("officer_id", sql.Int, actorId);
    updateRequest.input("status", sql.VarChar(30), status);
    updateRequest.input("is_resolved", sql.Bit, RESOLVED_STATUSES.includes(status) ? 1 : 0);

    const updateResult = await updateRequest.query(`
      UPDATE Complaints
      SET complaint_status = @status,
          handled_by_officer_id = @officer_id,
          resolved_at = CASE WHEN @is_resolved = 1 THEN GETDATE() ELSE resolved_at END
      OUTPUT INSERTED.complaint_id
      WHERE complaint_id = @complaint_id;
    `);

    if (updateResult.recordset.length === 0) {
      await transaction.rollback();
      return null;
    }

    if (note) {
      const noteRequest = new sql.Request(transaction);
      noteRequest.input("complaint_id", sql.Int, complaintId);
      noteRequest.input("officer_id", sql.Int, actorId);
      noteRequest.input("note", sql.VarChar(500), note);

      await noteRequest.query(`
        INSERT INTO ComplaintNotes (complaint_id, officer_id, note)
        VALUES (@complaint_id, @officer_id, @note);
      `);
    }

    await transaction.commit();

    return await getComplaintById(complaintId);
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

module.exports = {
  VALID_STATUSES,
  HYGIENE_TYPE,
  requiredRoleForType,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getComplaintsForVendor,
  getComplaintByIdForVendor,
  acknowledgeComplaint,
  createComplaint
};

// A patron/registered user files a new complaint against a stall. patron_id
// and complaint_status are always set here from the server side (never taken
// from the request body) so a user can never file a complaint as someone
// else, or submit one that's already "Resolved". complaint_id (an IDENTITY
// column) doubles as the "unique tracking ID" the user story asks for -
// there's no need for a separate generated code on top of it.
async function createComplaint(patronId, stallId, complaintType, description, imagePath = null) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("patron_id", sql.Int, patronId);
    request.input("stall_id", sql.Int, stallId);
    request.input("complaint_type", sql.VarChar(100), complaintType);
    request.input("description", sql.VarChar(500), description);
    request.input("image_path", sql.VarChar(255), imagePath);

    const result = await request.query(`
      INSERT INTO Complaints (patron_id, stall_id, complaint_type, description, complaint_status, image_path)
      OUTPUT INSERTED.complaint_id, INSERTED.patron_id, INSERTED.stall_id, INSERTED.complaint_type,
             INSERTED.description, INSERTED.complaint_status, INSERTED.created_at, INSERTED.image_path
      VALUES (@patron_id, @stall_id, @complaint_type, @description, 'Open', @image_path);
    `);

    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Vendor-only: same listing logic, but always scoped to their own stalls.
async function getComplaintsForVendor(vendorId, status) {
  return getComplaints({ status, vendorId });
}

// Vendor-only detail lookup. Returns null if the complaint doesn't exist or
// isn't against one of this vendor's own stalls (so a vendor can never peek
// at another vendor's complaints, even with a guessed ID).
async function getComplaintByIdForVendor(complaintId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("complaint_id", sql.Int, complaintId);
    request.input("vendor_id", sql.Int, vendorId);

    const ownsResult = await request.query(`
      SELECT c.complaint_id
      FROM Complaints c
      INNER JOIN Stalls s ON c.stall_id = s.stall_id
      WHERE c.complaint_id = @complaint_id AND s.vendor_id = @vendor_id;
    `);

    if (ownsResult.recordset.length === 0) return null;
  } finally {
    if (connection) await connection.close();
  }

  return getComplaintById(complaintId);
}

// Vendor acknowledges a complaint against their own stall. Only allowed while
// still "Open" - once an officer has moved it further along, the vendor can
// keep viewing it but can no longer touch its status (that's the officer's
// job from that point). Returns a discriminated outcome so the controller
// can pick the right HTTP status code.
async function acknowledgeComplaint(complaintId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const updateRequest = connection.request();
    updateRequest.input("complaint_id", sql.Int, complaintId);
    updateRequest.input("vendor_id", sql.Int, vendorId);

    const updateResult = await updateRequest.query(`
      UPDATE c
      SET complaint_status = 'Acknowledged'
      OUTPUT INSERTED.complaint_id
      FROM Complaints c
      INNER JOIN Stalls s ON c.stall_id = s.stall_id
      WHERE c.complaint_id = @complaint_id AND s.vendor_id = @vendor_id AND c.complaint_status = 'Open';
    `);

    if (updateResult.recordset.length > 0) {
      const complaint = await getComplaintById(complaintId);
      return { outcome: "acknowledged", complaint };
    }

    // The update touched zero rows - work out why, so we can tell the vendor something useful.
    const checkRequest = connection.request();
    checkRequest.input("complaint_id", sql.Int, complaintId);
    checkRequest.input("vendor_id", sql.Int, vendorId);

    const checkResult = await checkRequest.query(`
      SELECT c.complaint_status
      FROM Complaints c
      INNER JOIN Stalls s ON c.stall_id = s.stall_id
      WHERE c.complaint_id = @complaint_id AND s.vendor_id = @vendor_id;
    `);

    if (checkResult.recordset.length === 0) {
      return { outcome: "not_found" };
    }

    return { outcome: "invalid_status", currentStatus: checkResult.recordset[0].complaint_status };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}