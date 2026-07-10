const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function getProfileByUserId(userId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const sqlQuery = `SELECT user_id, full_name, email, role, phone_number, profile_image_url, created_at FROM Users WHERE user_id = @user_id;`

    const request = await connection.request()
    request.input("user_id", sql.Int, userId);

    const result = await request.query(sqlQuery);

    return result.recordset[0];
  } 
  
  catch (error) {
    console.error("Error getting profile:", error);
    throw error;
  } 
  
  finally {
    if (connection) {
      await connection.close();
    }
  }
}


async function updateProfileImage(userId, profileImageUrl) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const sqlQuery = `UPDATE Users SET profile_image_url = @profile_image_url WHERE user_id = @user_id;`;

    const request = await connection.request()
    request.input("user_id", sql.Int, userId);
    request.input("profile_image_url", sql.VarChar(255), profileImageUrl);

    const result = await request.query(sqlQuery);

    return result.rowsAffected[0];
  } 
  catch (error) {
    console.error("Error updating profile image:", error);
    throw error;
  } 
  
  finally {
    if (connection) {
      await connection.close();
    }
  }
}

async function updateProfileByUserId(userId, fullName, phoneNumber) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const result = await connection.request()
      .input("user_id", sql.Int, userId)
      .input("full_name", sql.VarChar(100), fullName)
      .input("phone_number", sql.VarChar(20), phoneNumber)
      .query(`
        UPDATE Users
        SET full_name = @full_name,
            phone_number = @phone_number
        WHERE user_id = @user_id;

        SELECT
          user_id,
          full_name,
          email,
          role,
          phone_number,
          profile_image_url
        FROM Users
        WHERE user_id = @user_id;
      `);

    return result.recordset[0];

  } catch (error) {
    console.error("Error updating profile:", error);
    throw error;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = {
  getProfileByUserId,
  updateProfileImage,
  updateProfileByUserId,
};