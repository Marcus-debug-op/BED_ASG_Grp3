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

/*
  Gets a JWT token for an existing vendor account.
  Defaults to the seeded vendor used by every other test file; pass a
  different seeded vendor email (e.g. getVendorToken(SECOND_VENDOR_EMAIL))
  when a test needs two vendors, e.g. to prove a promo code from one
  vendor's stall doesn't collide with another vendor's stall.

  Used by:
  - vendorProfileBusinessDetails.test.js
  - vendorOrders.test.js
  - promotionManagement.test.js
  - promotionCheckout.test.js
*/

async function getVendorToken(email = "marcusisavendor@gmail.com") {
  const user = await registerModel.findUserByEmail(email);

  if (!user) {
    throw new Error(`Seed vendor account not found (${email}). Run seed.sql first.`);
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
/*
  Finds a valid stall and menu item for a given vendor (defaults to the
  seeded vendor used everywhere else).

  Why this is needed:
  - Vendor order/promotion testing needs a real stall_id (and often a
    menu_item_id) to attach things to.

  Problem:
  - Hardcoding stall_id = 1 and menu_item_id = 4 may fail if the database changes.

  Solution:
  - This helper looks for a stall owned by the given vendor.
  - Then it looks for an available menu item under that stall.
  - If no menu item exists, it creates one for testing.

  Used by:
  - vendorOrders.test.js
  - promotionManagement.test.js
  - promotionCheckout.test.js
*/
async function getVendorTestMenuItem(vendorEmail = "marcusisavendor@gmail.com") {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_email", sql.VarChar(100), vendorEmail);

    /*
      Find one stall owned by the given vendor.
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
        WHERE email = @vendor_email
      )
      ORDER BY s.stall_id;
    `);

    if (result.recordset.length === 0) {
      throw new Error(`No stall found for ${vendorEmail}.`);
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

/*
  Always inserts a FRESH menu item at a caller-chosen price, rather than
  reusing whatever menu item already exists on the stall.

  Why this is needed:
  - Promotion/checkout tests need to control the exact order subtotal
    (e.g. to sit just above/below a promo's min_spend_amount), which isn't
    possible if getVendorTestMenuItem() happens to reuse an existing item
    at an unknown price.

  Used by:
  - promotionCheckout.test.js
*/
async function insertTestMenuItem(stallId, price) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("price", sql.Decimal(10, 2), price);

    const result = await request.query(`
      INSERT INTO MenuItems
        (stall_id, item_name, description, price, category, is_available)
      OUTPUT INSERTED.menu_item_id, INSERTED.price
      VALUES
        (@stall_id, 'Jest Promo Test Food', 'Created for Jest promo/checkout testing', @price, 'Test', 1);
    `);

    return result.recordset[0];

  } finally {
    if (connection) await connection.close();
  }
}

/*
  Finds an existing user by email, or creates one with the given role if it
  doesn't exist yet. Used to get officer/operator accounts, which (unlike
  patron/vendor) aren't seeded by seed.sql.

  The password_hash stored here is a placeholder - these test accounts
  never log in through the real /api/auth/login flow, they only ever get a
  token straight from generateUserToken(), matching how this whole file
  avoids depending on the login feature (see file header comment).
*/
async function getOrCreateTestUser(email, fullName, role) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const findRequest = connection.request();
    findRequest.input("email", sql.VarChar(100), email);

    const findResult = await findRequest.query(`
      SELECT user_id, full_name, email, role
      FROM Users
      WHERE email = @email;
    `);

    if (findResult.recordset.length > 0) {
      return findResult.recordset[0];
    }

    const insertRequest = connection.request();
    insertRequest.input("full_name", sql.VarChar(100), fullName);
    insertRequest.input("email", sql.VarChar(100), email);
    insertRequest.input("password_hash", sql.VarChar(255), "jest-test-account-not-a-real-login");
    insertRequest.input("role", sql.VarChar(20), role);
    insertRequest.input("phone_number", sql.VarChar(100), "90000000");

    const insertResult = await insertRequest.query(`
      INSERT INTO Users (full_name, email, password_hash, role, phone_number)
      OUTPUT INSERTED.user_id, INSERTED.full_name, INSERTED.email, INSERTED.role
      VALUES (@full_name, @email, @password_hash, @role, @phone_number);
    `);

    return insertResult.recordset[0];

  } finally {
    if (connection) await connection.close();
  }
}

/*
  Gets a JWT token for an officer test account (creating it the first time
  this runs). Officers handle "Hygiene" complaints.

  Used by:
  - complaintManagement.test.js
*/
async function getOfficerToken() {
  const user = await getOrCreateTestUser("jest-officer@hawkerhub.test", "Jest Test Officer", "officer");
  return generateUserToken(user);
}

/*
  Gets a JWT token for an operator test account (creating it the first time
  this runs). Operators handle every complaint type other than "Hygiene".

  Used by:
  - complaintManagement.test.js
*/
async function getOperatorToken() {
  const user = await getOrCreateTestUser("jest-operator@hawkerhub.test", "Jest Test Operator", "operator");
  return generateUserToken(user);
}

/*
  Inserts a Promotions row directly via SQL, bypassing the create-promotion
  API entirely (and the validation/overlap rules it enforces).

  Why this is needed:
  - Some scenarios (an already-expired code, an inactive code, a code with
    a minimum spend) are awkward or impossible to set up reliably through
    the API alone without tripping its own overlap/duplicate checks.
  - This gives each test a promotion row with exactly the fields it needs,
    independent of any other promotion already on that stall.

  promo_code is auto-suffixed with a random string so repeated test runs
  never collide with a previous run's leftover data.

  Used by:
  - promotionCheckout.test.js
*/
async function insertTestPromotion(stallId, overrides = {}) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const promo = {
      promo_code: `JEST${uniqueSuffix}`,
      discount_percent: 10,
      start_date: "2020-01-01",
      end_date: "2099-12-31",
      is_active: 1,
      min_spend_amount: null,
      max_redemptions: null,
      ...overrides
    };

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("promo_code", sql.VarChar(50), promo.promo_code);
    request.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    request.input("start_date", sql.Date, promo.start_date);
    request.input("end_date", sql.Date, promo.end_date);
    request.input("is_active", sql.Bit, promo.is_active);
    request.input("min_spend_amount", sql.Decimal(10, 2), promo.min_spend_amount);
    request.input("max_redemptions", sql.Int, promo.max_redemptions);

    const result = await request.query(`
      INSERT INTO Promotions
        (stall_id, promo_code, discount_percent, start_date, end_date, is_active, min_spend_amount, max_redemptions)
      OUTPUT INSERTED.promotion_id, INSERTED.promo_code
      VALUES
        (@stall_id, @promo_code, @discount_percent, @start_date, @end_date, @is_active, @min_spend_amount, @max_redemptions);
    `);

    return result.recordset[0];

  } finally {
    if (connection) await connection.close();
  }
}

/*
  Inserts a brand-new Stalls row for the given vendor, rather than reusing
  whatever stall already exists (getVendorTestMenuItem's demo stall).

  Why this is needed:
  - Promotion tests create promotions with wide date ranges and check
    is_active/overlap rules. Reusing the shared demo stall means every run
    collides with whatever's already on it - seeded demo promotions
    (e.g. BEANCURD10, active all of 2026) AND any promotion a PREVIOUS
    test run created and never cleaned up.
  - A fresh stall_id every run has zero existing promotions on it, so
    there's nothing left to collide with.

  Used by:
  - promotionManagement.test.js
  - promotionCheckout.test.js
*/
async function insertTestStall(vendorEmail = "marcusisavendor@gmail.com") {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const vendorRequest = connection.request();
    vendorRequest.input("vendor_email", sql.VarChar(100), vendorEmail);
    const vendorResult = await vendorRequest.query(`
      SELECT user_id FROM Users WHERE email = @vendor_email;
    `);

    if (vendorResult.recordset.length === 0) {
      throw new Error(`Seed vendor account not found (${vendorEmail}). Run seed.sql first.`);
    }

    const vendorId = vendorResult.recordset[0].user_id;

    const centreResult = await connection.request().query(`
      SELECT TOP 1 hawker_centre_id FROM HawkerCentres ORDER BY hawker_centre_id;
    `);

    if (centreResult.recordset.length === 0) {
      throw new Error("No HawkerCentres found. Run seed.sql first.");
    }

    const hawkerCentreId = centreResult.recordset[0].hawker_centre_id;
    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const insertRequest = connection.request();
    insertRequest.input("vendor_id", sql.Int, vendorId);
    insertRequest.input("hawker_centre_id", sql.Int, hawkerCentreId);
    insertRequest.input("stall_name", sql.VarChar(100), `Jest Test Stall ${uniqueSuffix}`);
    insertRequest.input("unit_number", sql.VarChar(20), `JT-${uniqueSuffix}`.slice(0, 20));

    const insertResult = await insertRequest.query(`
      INSERT INTO Stalls
        (vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number, is_active)
      OUTPUT INSERTED.stall_id
      VALUES
        (@vendor_id, @hawker_centre_id, @stall_name, 'Test', 'Created for Jest testing', @unit_number, 1);
    `);

    return insertResult.recordset[0].stall_id;

  } finally {
    if (connection) await connection.close();
  }
}

const SECOND_VENDOR_EMAIL = "matthewisavendor@example.com";

/*
  Inserts a minimal completed Order that references the given promotion,
  so promotionModel.deletePromotion()'s "never used" check has something
  real to find. Doesn't touch PromotionRedemptions - a bare Orders
  reference alone is enough to mark a promotion as used.

  Used by:
  - promotionManagement.test.js (the delete-blocked-if-used test)
*/
async function markPromotionAsUsed(promotionId, stallId, patronEmail = "marcusisapatron@gmail.com") {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const patronRequest = connection.request();
    patronRequest.input("email", sql.VarChar(100), patronEmail);
    const patronResult = await patronRequest.query(`
      SELECT user_id FROM Users WHERE email = @email;
    `);

    if (patronResult.recordset.length === 0) {
      throw new Error(`Seed patron account not found (${patronEmail}). Run seed.sql first.`);
    }

    const patronId = patronResult.recordset[0].user_id;

    const insertRequest = connection.request();
    insertRequest.input("patron_id", sql.Int, patronId);
    insertRequest.input("stall_id", sql.Int, stallId);
    insertRequest.input("promotion_id", sql.Int, promotionId);

    await insertRequest.query(`
      INSERT INTO Orders (patron_id, stall_id, promotion_id, order_status, total_amount)
      VALUES (@patron_id, @stall_id, @promotion_id, 'Completed', 9.99);
    `);

  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getPatronToken,
  getVendorToken,
  getVendorTestMenuItem,
  insertTestMenuItem,
  insertTestStall,
  getOfficerToken,
  getOperatorToken,
  insertTestPromotion,
  markPromotionAsUsed,
  SECOND_VENDOR_EMAIL
};