const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Saves a freshly generated reset token + expiry onto the user's row.
async function setResetToken(userId, token, expiry) {
  let connection;

  try {
    connection = await new sql.ConnectionPool(dbConfig).connect();

    const request = connection.request();
    request.input("user_id", sql.Int, userId);
    request.input("reset_token", sql.VarChar(255), token);
    request.input("token_expiry", sql.DateTime, expiry);

    await request.query(`
      UPDATE Users
      SET reset_token = @reset_token, token_expiry = @token_expiry
      WHERE user_id = @user_id;
    `);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Looks a user up by their reset token. Returns null if no user has this
// token at all - the controller is responsible for checking expiry.
async function findUserByResetToken(token) {
  let connection;

  try {
    connection = await new sql.ConnectionPool(dbConfig).connect();

    const request = connection.request();
    request.input("reset_token", sql.VarChar(255), token);

    const result = await request.query(`
      SELECT user_id, email, role, token_expiry
      FROM Users
      WHERE reset_token = @reset_token;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Sets the new password hash and immediately clears the token so it can
// never be reused, even if someone else still has the old email/link.
async function updatePasswordAndClearToken(userId, passwordHash) {
  let connection;

  try {
    connection = await new sql.ConnectionPool(dbConfig).connect();

    const request = connection.request();
    request.input("user_id", sql.Int, userId);
    request.input("password_hash", sql.VarChar(255), passwordHash);

    await request.query(`
      UPDATE Users
      SET password_hash = @password_hash, reset_token = NULL, token_expiry = NULL
      WHERE user_id = @user_id;
    `);
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { setResetToken, findUserByResetToken, updatePasswordAndClearToken };
