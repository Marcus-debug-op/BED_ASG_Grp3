const sql = require("mssql");
const dbConfig = require("../dbConfig");
 
/*
  SavedAddresses model (BED-223)
  ----------------------------------------------------------------------------
  This is the patron's reusable address book, and it is the feature that gives
  the patron side a full CRUD resource:
 
    Create  -> createAddress()
    Read    -> getAddressesByPatron()
    Update  -> updateAddress()
    Delete  -> deleteAddress()
 
  SECURITY NOTE that applies to every function below:
  Each query filters on patron_id, which the controller reads from the login
  token (never from the request body). That means a patron can only ever see or
  change their own addresses, even if they guess someone else's address_id.
*/
 
// ---------------------------------------------------------------------------
// CREATE - save a new address for this patron.
// Returns the newly created row (including its system-assigned address_id).
// ---------------------------------------------------------------------------
async function createAddress(patronId, address, postalCode, contactName, contactPhone) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
 
    const request = connection.request();
    // .input() binds each value safely (this is what prevents SQL injection).
    request.input("patron_id", sql.Int, patronId);
    request.input("address", sql.VarChar(255), address);
    request.input("postal_code", sql.VarChar(6), postalCode);
    request.input("contact_name", sql.VarChar(100), contactName || null);
    request.input("contact_phone", sql.VarChar(20), contactPhone || null);
 
    // OUTPUT INSERTED.* hands back the row that was just created, so the
    // frontend immediately knows the new address_id without a second query.
    const result = await request.query(`
      INSERT INTO SavedAddresses (patron_id, address, postal_code, contact_name, contact_phone)
      OUTPUT INSERTED.address_id, INSERTED.address, INSERTED.postal_code,
             INSERTED.contact_name, INSERTED.contact_phone, INSERTED.created_at
      VALUES (@patron_id, @address, @postal_code, @contact_name, @contact_phone);
    `);
 
    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}
 
// ---------------------------------------------------------------------------
// READ - list every address belonging to this patron, newest first.
// Returns an empty array (not an error) when the patron has none saved yet.
// ---------------------------------------------------------------------------
async function getAddressesByPatron(patronId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
 
    const request = connection.request();
    request.input("patron_id", sql.Int, patronId);
 
    // The WHERE patron_id clause is the ownership check: this can only ever
    // return the logged-in patron's own addresses.
    const result = await request.query(`
      SELECT address_id, address, postal_code, contact_name, contact_phone, created_at
      FROM SavedAddresses
      WHERE patron_id = @patron_id
      ORDER BY created_at DESC;
    `);
 
    return result.recordset;   // [] if the patron has no saved addresses
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}
 
// ---------------------------------------------------------------------------
// UPDATE - edit one saved address.
// Returns the updated row, or null if the id doesn't exist OR doesn't belong
// to this patron (the controller turns null into a 404).
// ---------------------------------------------------------------------------
async function updateAddress(addressId, patronId, address, postalCode, contactName, contactPhone) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
 
    const request = connection.request();
    request.input("address_id", sql.Int, addressId);
    request.input("patron_id", sql.Int, patronId);
    request.input("address", sql.VarChar(255), address);
    request.input("postal_code", sql.VarChar(6), postalCode);
    request.input("contact_name", sql.VarChar(100), contactName || null);
    request.input("contact_phone", sql.VarChar(20), contactPhone || null);
 
    // Note the AND patron_id = @patron_id: without it, a patron could edit
    // someone else's address just by guessing its id.
    const result = await request.query(`
      UPDATE SavedAddresses
      SET address = @address,
          postal_code = @postal_code,
          contact_name = @contact_name,
          contact_phone = @contact_phone
      OUTPUT INSERTED.address_id, INSERTED.address, INSERTED.postal_code,
             INSERTED.contact_name, INSERTED.contact_phone, INSERTED.created_at
      WHERE address_id = @address_id
        AND patron_id = @patron_id;
    `);
 
    return result.recordset[0] || null;   // null = not found / not theirs
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}
 
// ---------------------------------------------------------------------------
// DELETE - remove one saved address.
// Returns true if a row was actually deleted, false if nothing matched (either
// the id doesn't exist, or it belongs to a different patron).
// ---------------------------------------------------------------------------
async function deleteAddress(addressId, patronId) {
  let connection;
  try {
    connection = await sql.connect(dbConfig);
 
    const request = connection.request();
    request.input("address_id", sql.Int, addressId);
    request.input("patron_id", sql.Int, patronId);
 
    const result = await request.query(`
      DELETE FROM SavedAddresses
      WHERE address_id = @address_id
        AND patron_id = @patron_id;
    `);
 
    // rowsAffected[0] is how many rows the DELETE actually removed.
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}
 
module.exports = {
  createAddress,
  getAddressesByPatron,
  updateAddress,
  deleteAddress
};
