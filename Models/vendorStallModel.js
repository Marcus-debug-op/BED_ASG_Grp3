const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function getStallsByVendorId(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const sqlQuery = `
        SELECT s.stall_id, s.stall_name, c.cuisine_name AS cuisine_type, s.description, s.unit_number, s.is_active, s.current_hygiene_grade, h.centre_name
        FROM Stalls s INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
        LEFT JOIN Cuisines c ON s.cuisine_id = c.cuisine_id
        WHERE s.vendor_id = @vendor_id
        ORDER BY s.stall_name;
      `;

      const request = await connection.request();
      request.input("vendor_id", sql.Int, vendorId);

      const result = await request.query(sqlQuery);
      return result.recordset;
  }   
  
  catch (error) {
    console.error("Database error:", error);
    throw error;
  } 
  
  finally {
    if (connection) {
      await connection.close();
    }
  }
}

// BED-147: updates a stall's profile picture. Split into an existence
// check plus a vendor-scoped update so the controller can tell "stall
// doesn't exist at all" (404) apart from "stall exists, but isn't yours"
// (403) - the ticket's acceptance criteria specifically calls for 403 on
// the unauthorized case, not a generic 404.
async function getStallOwner(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      SELECT stall_id, vendor_id FROM Stalls WHERE stall_id = @stall_id;
    `);

    return result.recordset[0] || null;
  } finally {
    if (connection) await connection.close();
  }
}

async function updateStallImage(stallId, imageUrl) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    request.input("stall_id", sql.Int, stallId);
    request.input("image_url", sql.VarChar(255), imageUrl);

    const result = await request.query(`
      UPDATE Stalls
      SET image_url = @image_url
      OUTPUT INSERTED.stall_id, INSERTED.stall_name, INSERTED.image_url
      WHERE stall_id = @stall_id;
    `);

    return result.recordset[0] || null;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getStallsByVendorId,
  getStallOwner,
  updateStallImage
};