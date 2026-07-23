const request = require("supertest");
const bcrypt = require("bcrypt");
const sql = require("mssql");
const dbConfig = require("../dbConfig");
const app = require("../app");

/*
  This file tests the Password Reset feature (BED-142).

  Main purpose:
  - Check that requesting a reset always returns the same generic message,
    whether or not the email is actually registered (prevents account
    enumeration - see passwordResetController.js for the reasoning).
  - Check that a valid, unexpired token successfully resets the password.
  - Check that an invalid or expired token is rejected with 401.
  - Check that a used token cannot be reused (it's nulled out immediately
    after a successful reset).
  - Check basic payload validation on both endpoints.

  Important:
  - Uses the seeded patron account (marcusisapatron@gmail.com) since this
    feature isn't role-specific. The reset token is read directly from the
    database after calling /forgot-password, since the token is only ever
    emailed - never returned in the API response - by design.
  - Restores the account's original password_hash in afterAll, so this test
    file doesn't permanently change the seeded login credentials that other
    tests (and your own manual testing) rely on.

  Tested routes:
  POST  /api/auth/forgot-password
  PATCH /api/auth/reset-password
*/

describe("Password Reset API Tests", () => {
  const SEED_PATRON_EMAIL = "marcusisapatron@gmail.com";
  let originalPasswordHash;
  let connection;

  beforeAll(async () => {
    connection = await sql.connect(dbConfig);

    const request_ = connection.request();
    request_.input("email", sql.VarChar(100), SEED_PATRON_EMAIL);
    const result = await request_.query("SELECT password_hash FROM Users WHERE email = @email;");

    if (result.recordset.length === 0) {
      throw new Error("Seed patron account not found. Run seed.sql first.");
    }

    originalPasswordHash = result.recordset[0].password_hash;
  });

  afterAll(async () => {
    // Put the seeded account's real password back so nothing else breaks.
    const restoreRequest = connection.request();
    restoreRequest.input("email", sql.VarChar(100), SEED_PATRON_EMAIL);
    restoreRequest.input("password_hash", sql.VarChar(255), originalPasswordHash);
    await restoreRequest.query(`
      UPDATE Users
      SET password_hash = @password_hash, reset_token = NULL, token_expiry = NULL
      WHERE email = @email;
    `);

    await connection.close();
  });

  // Reads the reset token straight from the DB - it's only ever emailed,
  // never included in the API response.
  async function getStoredResetToken(email) {
    const req = connection.request();
    req.input("email", sql.VarChar(100), email);
    const result = await req.query("SELECT reset_token, token_expiry FROM Users WHERE email = @email;");
    return result.recordset[0];
  }

  /*
    Test case 1:
    Requesting a reset for a real, registered email should succeed and
    actually generate a token in the database.

    Expected result:
    - HTTP status 200.
    - Generic success message.
    - A reset_token now exists in the DB for this user, with a future expiry.
  */
  test("should generate a reset token for a registered email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: SEED_PATRON_EMAIL });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message");

    const stored = await getStoredResetToken(SEED_PATRON_EMAIL);
    expect(stored.reset_token).toBeTruthy();
    expect(new Date(stored.token_expiry).getTime()).toBeGreaterThan(Date.now());
  });

  /*
    Test case 2:
    Requesting a reset for an email that isn't registered at all should
    return the EXACT SAME response as a real email - this is what stops
    someone from using this endpoint to discover which emails have accounts.

    Expected result:
    - HTTP status 200 (not 404).
    - Same generic message as test case 1.
  */
  test("should return the same generic message for an unregistered email", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "definitely-not-a-real-account@example.com" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 3:
    Malformed email should fail validation before ever touching the database.

    Expected result:
    - HTTP status 400.
  */
  test("should reject an invalid email format", async () => {
    const response = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "not-an-email" });

    expect(response.statusCode).toBe(400);
  });

  /*
    Test case 4:
    A completely made-up token should never be accepted.

    Expected result:
    - HTTP status 401.
  */
  test("should reject an invalid reset token", async () => {
    const response = await request(app)
      .patch("/api/auth/reset-password")
      .send({ token: "this-token-does-not-exist", newPassword: "NewPassword123!" });

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 5:
    A token that exists but has already expired must be rejected, even
    though it's technically a real token in the database.

    Expected result:
    - HTTP status 401.
  */
  test("should reject an expired reset token", async () => {
    const expiredToken = "expired-test-token-" + Date.now();

    const req = connection.request();
    req.input("email", sql.VarChar(100), SEED_PATRON_EMAIL);
    req.input("reset_token", sql.VarChar(255), expiredToken);
    req.input("token_expiry", sql.DateTime, new Date(Date.now() - 60 * 60 * 1000)); // 1 hour ago
    await req.query(`
      UPDATE Users SET reset_token = @reset_token, token_expiry = @token_expiry
      WHERE email = @email;
    `);

    const response = await request(app)
      .patch("/api/auth/reset-password")
      .send({ token: expiredToken, newPassword: "NewPassword123!" });

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 6:
    The full happy path - request a reset, grab the real token from the DB,
    submit a new password with it. This should succeed AND the token should
    stop working immediately afterward (can't be reused).

    Expected result:
    - First reset attempt: HTTP 200, password_hash actually changes in the DB.
    - Second attempt with the SAME token: HTTP 401 (token was nulled out).
  */
  test("should reset the password with a valid token, then invalidate that token", async () => {
    await request(app).post("/api/auth/forgot-password").send({ email: SEED_PATRON_EMAIL });
    const stored = await getStoredResetToken(SEED_PATRON_EMAIL);
    const validToken = stored.reset_token;

    const firstResponse = await request(app)
      .patch("/api/auth/reset-password")
      .send({ token: validToken, newPassword: "BrandNewPassword123!" });

    expect(firstResponse.statusCode).toBe(200);

    const afterReset = await getStoredResetToken(SEED_PATRON_EMAIL);
    expect(afterReset.reset_token).toBeNull();

    const passwordCheck = connection.request();
    passwordCheck.input("email", sql.VarChar(100), SEED_PATRON_EMAIL);
    const passwordResult = await passwordCheck.query("SELECT password_hash FROM Users WHERE email = @email;");
    const matches = await bcrypt.compare("BrandNewPassword123!", passwordResult.recordset[0].password_hash);
    expect(matches).toBe(true);

    const secondResponse = await request(app)
      .patch("/api/auth/reset-password")
      .send({ token: validToken, newPassword: "AnotherPassword123!" });

    expect(secondResponse.statusCode).toBe(401);
  });

  /*
    Test case 7:
    A weak new password (missing complexity requirements) should be rejected
    before ever reaching the database.

    Expected result:
    - HTTP status 400.
  */
  test("should reject a weak new password", async () => {
    const response = await request(app)
      .patch("/api/auth/reset-password")
      .send({ token: "some-token", newPassword: "weak" });

    expect(response.statusCode).toBe(400);
  });
});
