const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function getStallsByVendorId(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const sqlQuery = `
        SELECT s.stall_id, s.stall_name, s.cuisine_type, s.description, s.unit_number, s.is_active, s.current_hygiene_grade, h.centre_name
        FROM Stalls s INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
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

module.exports = {
  getStallsByVendorId
};