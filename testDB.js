const sql = require("mssql");
const dbConfig = require("./dbConfig");

async function testConnection() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const sqlQuery = `SELECT * FROM Promotions`;
    const result = await connection.request().query(sqlQuery);

    console.log(result.recordset);
  } catch (err) {
    console.error("Database connection failed:", err);
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

testConnection();