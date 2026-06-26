const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function getAllHawkerCentres() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const sqlQuery = `
      SELECT hawker_centre_id, centre_name, address, area FROM HawkerCentres WHERE is_active = 1 ORDER BY centre_name;
    `;

    const result = await connection.request().query(sqlQuery);

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
  getAllHawkerCentres
};