const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Shared SELECT list joining Stalls (for stall_name) and Users (for the
// vendor's name), used by every read below so the API never has to make
// the frontend do a second lookup just to show "which stall / which vendor".
const SELECT_COLUMNS = `
  ra.rental_agreement_id, ra.stall_id, s.stall_name,
  s.vendor_id, u.full_name AS vendor_name,
  ra.lease_start_date, ra.lease_end_date, ra.monthly_rent,
  ra.agreement_status, ra.is_accepted, ra.acceptance_timestamp,
  ra.created_at
`;

const FROM_JOINS = `
  FROM RentalAgreements ra
  INNER JOIN Stalls s ON ra.stall_id = s.stall_id
  INNER JOIN Users u ON s.vendor_id = u.user_id
`;

// BED-23: used by the controller to reject creating an agreement for a
// stall that doesn't exist, before attempting the insert.
async function stallExists(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      SELECT stall_id FROM Stalls WHERE stall_id = @stall_id;
    `);

    return result.recordset.length > 0;
  } finally {
    if (connection) await connection.close();
  }
}

// BED-23: operator creates a new agreement for a stall (which always has
// exactly one vendor via Stalls.vendor_id, so there's no separate
// vendor_id column on this table - the acceptance criteria's "cannot
// create an agreement for a stall without an assigned vendor" is enforced
// by Stalls.vendor_id already being NOT NULL).
//
// IMPORTANT: the follow-up SELECT uses the SAME connection/request that
// the INSERT ran on, instead of calling getAgreementById() (which opens
// its OWN connection). node-mssql's sql.connect() shares one global
// connection pool by default, so if this function's `finally` block were
// to run while a separately-opened inner connection is also being closed,
// the shared pool gets torn down mid-flight and the read fails with
// "ConnectionError: Connection is closed" - even though the INSERT itself
// already succeeded. Reusing `request` here avoids that entirely.
async function createAgreement({ stall_id, lease_start_date, lease_end_date, monthly_rent }) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    request.input("stall_id", sql.Int, stall_id);
    request.input("lease_start_date", sql.Date, lease_start_date);
    request.input("lease_end_date", sql.Date, lease_end_date);
    request.input("monthly_rent", sql.Decimal(10, 2), monthly_rent);

    const insertResult = await request.query(`
      INSERT INTO RentalAgreements
        (stall_id, lease_start_date, lease_end_date, monthly_rent)
      OUTPUT INSERTED.rental_agreement_id
      VALUES (@stall_id, @lease_start_date, @lease_end_date, @monthly_rent);
    `);

    const newId = insertResult.recordset[0].rental_agreement_id;

    // New request on the same connection, not a new sql.connect() call.
    const readRequest = connection.request();
    readRequest.input("id", sql.Int, newId);

    const readResult = await readRequest.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE ra.rental_agreement_id = @id;
    `);

    return readResult.recordset[0];
  } finally {
    if (connection) await connection.close();
  }
}

// BED-23: operator's full list, across all vendors/stalls.
async function getAllAgreements() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    const result = await request.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      ORDER BY ra.created_at DESC;
    `);

    return result.recordset;
  } finally {
    if (connection) await connection.close();
  }
}

// Shared by both the operator ("any agreement") and vendor ("only their
// own", filtered separately in the controller) detail views. Safe to call
// on its own since it opens and closes a single connection with nothing
// else running concurrently against it.
async function getAgreementById(agreementId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, agreementId);

    const result = await request.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE ra.rental_agreement_id = @id;
    `);

    return result.recordset[0] || null;
  } finally {
    if (connection) await connection.close();
  }
}

// BED-23: operator updates rental period, fee, and/or status. Deliberately
// separate from BED-74's acceptMyAgreement - operator never touches
// is_accepted, vendor never touches these fields.
// Same fix as createAgreement: reuses the open connection for the
// follow-up read instead of calling getAgreementById().
async function updateAgreement(agreementId, { lease_start_date, lease_end_date, monthly_rent, agreement_status }) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    request.input("id", sql.Int, agreementId);
    request.input("lease_start_date", sql.Date, lease_start_date);
    request.input("lease_end_date", sql.Date, lease_end_date);
    request.input("monthly_rent", sql.Decimal(10, 2), monthly_rent);
    request.input("agreement_status", sql.VarChar(20), agreement_status);

    const updateResult = await request.query(`
      UPDATE RentalAgreements
      SET lease_start_date = @lease_start_date,
          lease_end_date = @lease_end_date,
          monthly_rent = @monthly_rent,
          agreement_status = @agreement_status
      WHERE rental_agreement_id = @id;
    `);

    if (updateResult.rowsAffected[0] === 0) {
      return null;
    }

    const readRequest = connection.request();
    readRequest.input("id", sql.Int, agreementId);

    const readResult = await readRequest.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE ra.rental_agreement_id = @id;
    `);

    return readResult.recordset[0];
  } finally {
    if (connection) await connection.close();
  }
}

// BED-74: vendor's own agreements only, scoped via Stalls.vendor_id - a
// vendor can never see another vendor's agreement through this function.
async function getAgreementsForVendor(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE s.vendor_id = @vendor_id
      ORDER BY ra.created_at DESC;
    `);

    return result.recordset;
  } finally {
    if (connection) await connection.close();
  }
}

// Safe to call on its own (see getAgreementById's comment above).
async function getAgreementByIdForVendor(agreementId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, agreementId);
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE ra.rental_agreement_id = @id AND s.vendor_id = @vendor_id;
    `);

    return result.recordset[0] || null;
  } finally {
    if (connection) await connection.close();
  }
}

// BED-74: the vendor's only write action on this table - flips is_accepted
// and stamps acceptance_timestamp. Scoped by vendor_id in the WHERE clause
// itself, not just in a prior SELECT, so there's no window where a vendor
// could accept an agreement that isn't theirs.
// Same fix as createAgreement/updateAgreement: every read/write below
// reuses the one open `connection`, instead of calling
// getAgreementByIdForVendor() (which used to open its own separate
// connection twice in here, closing the shared pool mid-flight).
async function acceptAgreement(agreementId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const checkRequest = connection.request();
    checkRequest.input("id", sql.Int, agreementId);
    checkRequest.input("vendor_id", sql.Int, vendorId);

    const checkResult = await checkRequest.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE ra.rental_agreement_id = @id AND s.vendor_id = @vendor_id;
    `);

    const existing = checkResult.recordset[0] || null;

    if (!existing) {
      return { outcome: "not_found" };
    }

    if (existing.is_accepted) {
      return { outcome: "already_accepted", agreement: existing };
    }

    const updateRequest = connection.request();
    updateRequest.input("id", sql.Int, agreementId);
    updateRequest.input("vendor_id", sql.Int, vendorId);

    await updateRequest.query(`
      UPDATE RentalAgreements
      SET is_accepted = 1, acceptance_timestamp = GETDATE()
      WHERE rental_agreement_id = @id
        AND stall_id IN (SELECT stall_id FROM Stalls WHERE vendor_id = @vendor_id);
    `);

    const readRequest = connection.request();
    readRequest.input("id", sql.Int, agreementId);
    readRequest.input("vendor_id", sql.Int, vendorId);

    const readResult = await readRequest.query(`
      SELECT ${SELECT_COLUMNS}
      ${FROM_JOINS}
      WHERE ra.rental_agreement_id = @id AND s.vendor_id = @vendor_id;
    `);

    return { outcome: "success", agreement: readResult.recordset[0] };
  } finally {
    if (connection) await connection.close();
  }
}

// BED-23: operator permanently deletes a rental agreement.
// Returns true if a row was removed, false if the id didn't exist - lets
// the controller answer 404 rather than reporting a successful delete of
// something that was never there.
async function deleteAgreement(agreementId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("id", sql.Int, agreementId);

    const result = await request.query(`
      DELETE FROM RentalAgreements
      WHERE rental_agreement_id = @id;
    `);

    return result.rowsAffected[0] > 0;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  stallExists,
  createAgreement,
  getAllAgreements,
  getAgreementById,
  updateAgreement,
  deleteAgreement,
  getAgreementsForVendor,
  getAgreementByIdForVendor,
  acceptAgreement
};