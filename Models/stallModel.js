const sql = require("mssql");
const dbConfig = require("../dbConfig");

// BED-61: Stall Listing API (supports optional search + cuisine filter via query params)
async function getAllStalls(filters = {}) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();

    let sqlQuery = `
      SELECT s.stall_id, s.stall_name, s.cuisine_type, s.description, s.unit_number,
             h.hawker_centre_id, h.centre_name, h.area
      FROM Stalls s
      INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
      WHERE s.is_active = 1
    `;

    if (filters.search) {
      sqlQuery += ` AND (s.stall_name LIKE @search OR s.description LIKE @search)`;
      request.input("search", sql.NVarChar, `%${filters.search}%`);
    }

    if (filters.cuisine) {
      sqlQuery += ` AND s.cuisine_type = @cuisine`;
      request.input("cuisine", sql.NVarChar, filters.cuisine);
    }

    if (filters.hawkerCentreId) {
      sqlQuery += ` AND s.hawker_centre_id = @hawkerCentreId`;
      request.input("hawkerCentreId", sql.Int, filters.hawkerCentreId);
    }

    sqlQuery += ` ORDER BY s.stall_name;`;

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
  getAllStalls
};
