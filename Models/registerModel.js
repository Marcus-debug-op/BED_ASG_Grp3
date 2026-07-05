const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function findUserByEmail(email) {
    let connection;
    try {
        connection = await sql.connect(dbConfig);

        const sqlQuery = `
    SELECT user_id, full_name, email, password_hash, role
    FROM Users
    WHERE email = @email
    `;

        const request = await connection.request();
        request.input("email",sql.VarChar(100), email);

        const result = await request.query(sqlQuery);

        console.log("Rows returned:", result.recordset);

        return result.recordset[0];
    }

    catch(error) {
        console.error("Database error:", error);
        throw error;
        }

    finally{
        if (connection) {
            try {
                await connection.close();
            } 
            
            catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
}


async function createPatron(userData) {
    let connection;
    try {
        connection = await sql.connect(dbConfig);

        const sqlQuery =  `
        INSERT INTO Users (full_name, email, password_hash, role, phone_number)
        VALUES (@full_name, @email, @password_hash, 'patron', @phone_number);
        `;

        const request = await connection.request();
        request.input("full_name",sql.VarChar(100), userData.full_name);
        request.input("email",sql.VarChar(100), userData.email);
        request.input("password_hash",sql.VarChar(255), userData.password_hash);
        request.input("phone_number",sql.VarChar(100), userData.phone_number);

        const result = await request.query(sqlQuery);


        return result.rowsAffected[0];
    }

    catch(error) {
        console.error("Database error:", error);
        throw error;
    }

    finally{
        if (connection) {
            try {
                await connection.close();
            } 
            
            catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
}


//".Transaction" is used because this function consist of 2 queries, with this it ensures that multiple SQL actions that must succeed together.
async function createVendor(userData) {
    let connection;
    let transaction;

     try {
    connection = await sql.connect(dbConfig);
    transaction = new sql.Transaction(connection)

    await transaction.begin();

    const userRequest = new sql.Request(transaction);

    const userQuery = `
      INSERT INTO Users (full_name, email, password_hash, role, phone_number)
      VALUES (@full_name, @email, @password_hash, 'vendor', @phone_number);

      SELECT CAST(SCOPE_IDENTITY() AS INT) AS user_id;
    `;
     const request = await connection.request();

    const userResult = await userRequest
      .input("full_name", sql.VarChar(100), userData.full_name)
      .input("email", sql.VarChar(100), userData.email)
      .input("password_hash", sql.VarChar(255), userData.password_hash)
      .input("phone_number", sql.VarChar(20), userData.phone_number)
      .query(userQuery);

    const userId = userResult.recordset[0].user_id;;

    const stallRequest = new sql.Request(transaction);

    const stallQuery = `
      INSERT INTO Stalls 
      (vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number)
      VALUES
      (@vendor_id, @hawker_centre_id, @stall_name, @cuisine_type, @description, @unit_number);

      SELECT CAST(SCOPE_IDENTITY() AS INT) AS stall_id;
    `;

    const stallResult = await stallRequest
      .input("vendor_id", sql.Int, userId)
      .input("stall_name", sql.VarChar(100), userData.stall_name)
      .input("cuisine_type", sql.VarChar(50), userData.cuisine_type || null)
      .input("description", sql.VarChar(255), userData.description|| null)
      .input("unit_number", sql.VarChar(20), userData.unit_number || null)
      .input("hawker_centre_id", sql.Int, userData.hawker_centre_id)
      .query(stallQuery);

    await transaction.commit();

    return {
      user_id: userId,
      stall_id: stallResult.recordset[0].stall_id,
    };
}

    catch(error) {
        await transaction.rollback();
        console.error("Database error:", error);
        throw error;
    }

    finally{
        if (connection) {
            try {
                await connection.close();
            } 
            
            catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
}


module.exports = {
  findUserByEmail,
  findUserAuthByEmail: findUserByEmail,
  createPatron,
  createVendor,
};