const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function findUserByEmail(email) {
    let connection;
    try {
        connection = await sql.connect(dbConfig);

        const sqlQuery =  `
        SELECT user_id, name, email, role FROM Users WHERE email = @email 
        `;

        const request = await connection.request();
        request.input("email",sql.VarChar(100), email);
        
        const result = await request.query(sqlQuery);


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
        INSERT INTO Users (name, email, password_hash, role, phone_number)
        VALUES (@name, @email, @password_hash, 'patron', @phone_number);
        `;

        const request = await connection.request();
        request.input("name",sql.VarChar(100), userData.name);
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
    const transaction = new sql.Transaction();

     try {
    connection = await sql.connect(dbConfig);
    transaction.connection = connection;

    await transaction.begin();

    const request1 = new sql.Request(transaction);

    const userQuery = `
      INSERT INTO Users (name, email, password_hash, role, phone_number)
      VALUES (@name, @email, @password_hash, 'vendor', @phone_number);
    `;

    const userResult = await request1
      .input("name", sql.VarChar(100), userData.name)
      .input("email", sql.VarChar(100), userData.email)
      .input("password_hash", sql.VarChar(255), userData.password_hash)
      .input("phone_number", sql.VarChar(20), userData.phone_number)
      .query(userQuery);

    const userId = userResult.recordset[0].user_id;

    const request2 = new sql.Request(transaction);

    const vendorQuery = `
      INSERT INTO VendorProfiles 
      (user_id, stall_name, cuisine_type, stall_description, unit_number)
      VALUES
      (@user_id, @stall_name, @cuisine_type, @stall_description, @unit_number);
    `;

    await request2
      .input("user_id", sql.Int, userId)
      .input("stall_name", sql.VarChar(100), userData.stall_name)
      .input("cuisine_type", sql.VarChar(50), userData.cuisine_type || null)
      .input("stall_description", sql.VarChar(255), userData.stall_description || null)
      .input("unit_number", sql.VarChar(20), userData.unit_number || null)
      .query(vendorQuery);

    await transaction.commit();

    return { user_id: userId };
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
  createPatron,
  createVendor,
};