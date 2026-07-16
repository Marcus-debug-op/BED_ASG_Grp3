const sql = require("mssql");
const dbConfig = require("../dbConfig");
const registerModel = require("../Models/registerModel");
const { generateUserToken } = require("../Utils/token");

/*
  This file contains helper functions used by multiple Jest test files.

  Why this file exists:
  - Some APIs require authentication.
  - Normally, the user logs in to get a JWT token.
  - But login is another teammate's feature.
  - To keep our tests focused on our own features, we generate valid tokens directly from seeded users.

  Important:
  - The users below must already exist in the database.
  - If they do not exist, run seed.sql first.
*/

/*
  Gets a JWT token for an existing patron account.

  Used by:
  - profile.test.js
  - vendorOrders.test.js

  Purpose:
  - Allows tests to access patron-protected APIs.
*/
async function getPatronToken() {
  const user = await registerModel.findUserByEmail("marcusisapatron@gmail.com");

  if (!user) {
    throw new Error("Seed patron account not found. Run seed.sql first.");
  }

  return generateUserToken(user);
}

/*
  Gets a JWT token for an existing vendor account.

  Used by:
  - vendorProfileBusinessDetails.test.js
  - vendorOrders.test.js

  Purpose:
  - Allows tests to access vendor-protected APIs.
*/

async function getVendorToken() {
  const user = await registerModel.findUserByEmail("marcusisavendor@gmail.com");

  if (!user) {
    throw new Error("Seed vendor account not found. Run seed.sql first.");
  }

  return generateUserToken(user);
}

/*
  Finds a valid stall and menu item for the vendor order tests.

  Why this is needed:
  - Vendor order testing needs a customer order.
  - Creating an order requires:
    1. stall_id
    2. menu_item_id

  Problem:
  - Hardcoding stall_id = 1 and menu_item_id = 4 may fail if the database changes.

  Solution:
  - This helper looks for a stall owned by the seeded vendor.
  - Then it looks for an available menu item under that stall.
  - If no menu item exists, it creates one for testing.

  Used by:
  - vendorOrders.test.js
*/
async function getVendorTestMenuItem() {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();

    /*
      Find one stall owned by the seeded vendor.
      Also try to get one available menu item under that stall.
    */
    const result = await request.query(`
      SELECT TOP 1
        s.stall_id,
        mi.menu_item_id
      FROM Stalls s
      LEFT JOIN MenuItems mi
        ON mi.stall_id = s.stall_id
        AND mi.is_available = 1
      WHERE s.vendor_id = (
        SELECT user_id
        FROM Users
        WHERE email = 'marcusisavendor@gmail.com'
      )
      ORDER BY s.stall_id;
    `);

    if (result.recordset.length === 0) {
      throw new Error("No stall found for marcusisavendor@gmail.com.");
    }

    const stallId = result.recordset[0].stall_id;
    let menuItemId = result.recordset[0].menu_item_id;

    /*
      If the vendor has a stall but no available menu item,
      create a simple test menu item so the order test can continue.
    */
    if (!menuItemId) {
      const insertRequest = connection.request();

      insertRequest.input("stall_id", sql.Int, stallId);

      const insertResult = await insertRequest.query(`
        INSERT INTO MenuItems
          (stall_id, item_name, description, price, category, is_available)
        OUTPUT INSERTED.menu_item_id
        VALUES
          (@stall_id, 'Jest Test Food', 'Created for Jest order testing', 3.50, 'Test', 1);
      `);

      menuItemId = insertResult.recordset[0].menu_item_id;
    }

    return {
      stall_id: stallId,
      menu_item_id: menuItemId
    };

  } finally {
    /*
      Close the SQL connection after the helper is done.
      This prevents Jest from hanging after tests finish.
    */
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = {
  getPatronToken,
  getVendorToken,
  getVendorTestMenuItem
};