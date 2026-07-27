const sql = require("mssql");
const dbConfig = require("../dbConfig");

const STALL_COLUMNS = `
  stall_id, vendor_id, stall_name, description, unit_number,
  is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url
`;

async function createStall(stall) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, stall.vendor_id);
    request.input("stall_name", sql.VarChar(100), stall.stall_name);
    request.input("description", sql.VarChar(255), stall.description || null);
    request.input("unit_number", sql.VarChar(20), stall.unit_number || null);
    request.input("hawker_centre_id", sql.Int, stall.hawker_centre_id);
    request.input("operating_hours", sql.VarChar(50), stall.operating_hours || null);
    request.input("price_range", sql.VarChar(20), stall.price_range || null);
    request.input("phone_number", sql.VarChar(20), stall.phone_number || null);
    request.input("image_url", sql.VarChar(255), stall.image_url || null);

    const result = await request.query(`
      INSERT INTO Stalls (
        vendor_id, stall_name, description, unit_number,
        hawker_centre_id, operating_hours, price_range, phone_number, image_url
      )
      OUTPUT ${STALL_COLUMNS.split(",").map((c) => `INSERTED.${c.trim()}`).join(", ")}
      VALUES (
        @vendor_id, @stall_name, @description, @unit_number,
        @hawker_centre_id, @operating_hours, @price_range, @phone_number, @image_url
      );
    `);

    return result.recordset[0];
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return { error: "DUPLICATE_UNIT_NUMBER" };
    }
    if (error.number === 547) {
      return { error: "INVALID_REFERENCE" }; // bad vendor_id or hawker_centre_id
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function getAllStalls() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    const result = await request.query(`
      SELECT ${STALL_COLUMNS} FROM Stalls ORDER BY stall_id;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function getStallById(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      SELECT ${STALL_COLUMNS} FROM Stalls WHERE stall_id = @stall_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateStall(stallId, stall) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("vendor_id", sql.Int, stall.vendor_id);
    request.input("stall_name", sql.VarChar(100), stall.stall_name);
    request.input("description", sql.VarChar(255), stall.description || null);
    request.input("unit_number", sql.VarChar(20), stall.unit_number || null);
    request.input("hawker_centre_id", sql.Int, stall.hawker_centre_id);
    request.input("operating_hours", sql.VarChar(50), stall.operating_hours || null);
    request.input("price_range", sql.VarChar(20), stall.price_range || null);
    request.input("phone_number", sql.VarChar(20), stall.phone_number || null);
    request.input("image_url", sql.VarChar(255), stall.image_url || null);

    const result = await request.query(`
      UPDATE Stalls
      SET vendor_id = @vendor_id,
          stall_name = @stall_name,
          description = @description,
          unit_number = @unit_number,
          hawker_centre_id = @hawker_centre_id,
          operating_hours = @operating_hours,
          price_range = @price_range,
          phone_number = @phone_number,
          image_url = @image_url
      OUTPUT ${STALL_COLUMNS.split(",").map((c) => `INSERTED.${c.trim()}`).join(", ")}
      WHERE stall_id = @stall_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return { error: "DUPLICATE_UNIT_NUMBER" };
    }
    if (error.number === 547) {
      return { error: "INVALID_REFERENCE" };
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Soft delete - flips is_active to 0 rather than removing the row, so rentals/
// orders/history tied to this stall_id stay intact.
async function deactivateStall(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      UPDATE Stalls
      SET is_active = 0
      OUTPUT ${STALL_COLUMNS.split(",").map((c) => `INSERTED.${c.trim()}`).join(", ")}
      WHERE stall_id = @stall_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// List of vendors for the operator's "assign to vendor" dropdown when
// creating/editing a stall. Deliberately minimal fields - just enough to
// identify the vendor in a UI, not their full profile.
async function getVendorOptions() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    const result = await request.query(`
      SELECT user_id, full_name, email
      FROM Users
      WHERE role = 'vendor'
      ORDER BY full_name;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { createStall, getAllStalls, getStallById, updateStall, deactivateStall, getVendorOptions };
