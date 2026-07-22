const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function deactivateOwnAccount(userId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("user_id", sql.Int, userId);

    const result = await request.query(`
      UPDATE Users
      SET 
        is_active = 0,
        deactivated_at = GETDATE()
      OUTPUT
        INSERTED.user_id,
        INSERTED.full_name,
        INSERTED.email,
        INSERTED.role,
        INSERTED.is_active,
        INSERTED.deactivated_at
      WHERE user_id = @user_id
        AND is_active = 1;
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
  deactivateOwnAccount
};