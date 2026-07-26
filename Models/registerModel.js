const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function findUserByEmail(email) {
    let connection;
    try {
        connection = await new sql.ConnectionPool(dbConfig).connect();

        const sqlQuery = `SELECT user_id, full_name, email, password_hash, role, phone_number, is_active, badge_id FROM Users WHERE email = @email`;

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
        connection = await new sql.ConnectionPool(dbConfig).connect();

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


/* Creates a new vendor account and a related stall record.
A transaction is used because vendor registration requires two database inserts:
//
1. Insert the vendor into the Users table.
2. Insert the vendor's stall into the Stalls table.

Both inserts must succeed together.
If the user is created but the stall insert fails, the transaction will roll back
so the database does not end up with a vendor account that has no linked stall.
*/

async function createVendor(userData) {
    let connection;
    let transaction;

     try {
    connection = await new sql.ConnectionPool(dbConfig).connect();

     // Create a transaction using the current database connection.
    transaction = new sql.Transaction(connection)

    // Start the transaction before running the insert queries.
    await transaction.begin();

    // This request is attached to the transaction.
    // This means the query will only be permanently saved if the transaction commits.
    const userRequest = new sql.Request(transaction);

    const userQuery = `
      INSERT INTO Users (full_name, email, password_hash, role, phone_number)
      VALUES (@full_name, @email, @password_hash, 'vendor', @phone_number);

      SELECT CAST(SCOPE_IDENTITY() AS INT) AS user_id;
    `;

     

    // Insert the vendor account into the Users table.
    // Parameterized inputs are used to safely pass values into the SQL query.
    const userResult = await userRequest
      .input("full_name", sql.VarChar(100), userData.full_name)
      .input("email", sql.VarChar(100), userData.email)
      .input("password_hash", sql.VarChar(255), userData.password_hash)
      .input("phone_number", sql.VarChar(20), userData.phone_number)
      .query(userQuery);

    
    // Get the newly created vendor's user_id.
    // This ID is needed to link the stall to the vendor.
    const userId = userResult.recordset[0].user_id;;


    // Create another request under the same transaction for the stall insert.
    const stallRequest = new sql.Request(transaction);

    const stallQuery = `
      INSERT INTO Stalls 
      (vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number)
      VALUES
      (@vendor_id, @hawker_centre_id, @stall_name, @cuisine_type, @description, @unit_number);

      SELECT CAST(SCOPE_IDENTITY() AS INT) AS stall_id;
    `;
    
    // Insert the stall record and link it to the vendor using vendor_id.
    const stallResult = await stallRequest
      .input("vendor_id", sql.Int, userId)
      .input("stall_name", sql.VarChar(100), userData.stall_name)
      .input("cuisine_type", sql.VarChar(50), userData.cuisine_type)
      .input("description", sql.VarChar(255), userData.description)
      .input("unit_number", sql.VarChar(20), userData.unit_number)
      .input("hawker_centre_id", sql.Int, userData.hawker_centre_id)
      .query(stallQuery);
    
    // If both inserts succeed, permanently save the changes.
    await transaction.commit();
    

    // Return both IDs so the controller can send them back in the response.
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