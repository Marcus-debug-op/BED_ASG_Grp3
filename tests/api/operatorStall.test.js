const request = require("supertest");
const sql = require("mssql");
const dbConfig = require("../../dbConfig");
const app = require("../../app");
const {
  getOperatorToken,
  getVendorToken,
  getPatronToken,
  insertTestStall
} = require("../testHelpers");

/*
  This file tests the Operator Stall Record Management API (BED-28).

  Covers the full CRUD + deactivate flow described in the ticket:
  - POST   /api/operator/stalls        -> create, 201
  - GET    /api/operator/stalls        -> list, 200
  - GET    /api/operator/stalls/:id    -> single record, 200 / 404
  - PUT    /api/operator/stalls/:id    -> update, 200 / 404
  - DELETE /api/operator/stalls/:id    -> soft delete (is_active = 0), 200 / 404
  - Role checks: 401 with no token, 403 for a non-operator (vendor/patron)
  - Validation: 400 on missing required fields / invalid references

  Uses insertTestStall() from testHelpers for read/update/deactivate cases,
  and looks up a real vendor_id + hawker_centre_id directly for the create
  test, since creating a stall is exactly what's under test here.
*/

describe("Operator Stall Management API Tests", () => {
  let operatorToken;
  let vendorToken;
  let patronToken;
  let validVendorId;
  let validHawkerCentreId;
  let connection;

  beforeAll(async () => {
    [operatorToken, vendorToken, patronToken] = await Promise.all([
      getOperatorToken(),
      getVendorToken(),
      getPatronToken()
    ]);

    connection = await sql.connect(dbConfig);

    const vendorResult = await connection.request().query(`
      SELECT TOP 1 user_id FROM Users WHERE role = 'vendor' ORDER BY user_id;
    `);
    validVendorId = vendorResult.recordset[0].user_id;

    const centreResult = await connection.request().query(`
      SELECT TOP 1 hawker_centre_id FROM HawkerCentres ORDER BY hawker_centre_id;
    `);
    validHawkerCentreId = centreResult.recordset[0].hawker_centre_id;
  });

  afterAll(async () => {
    if (connection) await connection.close();
  });

  /*
    Test case 1:
    An operator creating a stall with valid data should succeed.

    Expected result:
    - HTTP status 201.
    - Response includes the new stall_id and the fields submitted.
  */
  test("should create a new stall record as operator", async () => {
    const uniqueSuffix = `${Date.now()}`;

    const response = await request(app)
      .post("/api/operator/stalls")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        vendor_id: validVendorId,
        stall_name: `Jest Created Stall ${uniqueSuffix}`,
        hawker_centre_id: validHawkerCentreId,
        cuisine_type: "Test",
        unit_number: `JC-${uniqueSuffix}`.slice(0, 20)
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("stall_id");
    expect(response.body.stall_name).toBe(`Jest Created Stall ${uniqueSuffix}`);
    expect(response.body.is_active).toBe(true);
  });

  /*
    Test case 2:
    Missing required fields (stall_name, hawker_centre_id, vendor_id) should
    be rejected before ever reaching the database.

    Expected result:
    - HTTP status 400.
  */
  test("should reject stall creation with missing required fields", async () => {
    const response = await request(app)
      .post("/api/operator/stalls")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({ cuisine_type: "Test" });

    expect(response.statusCode).toBe(400);
  });

  /*
    Test case 3:
    A vendor_id that doesn't correspond to any real user should be rejected
    as invalid input, not crash the server with a raw SQL FK error.

    Expected result:
    - HTTP status 400.
  */
  test("should reject stall creation with a non-existent vendor_id", async () => {
    const response = await request(app)
      .post("/api/operator/stalls")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        vendor_id: 999999,
        stall_name: "Should Not Be Created",
        hawker_centre_id: validHawkerCentreId
      });

    expect(response.statusCode).toBe(400);
  });

  /*
    Test case 4:
    An operator should be able to list every stall record (both active and
    inactive), and fetch one specific record by id.

    Expected result:
    - HTTP status 200 for both.
    - The list is a non-empty array.
    - The single-record fetch returns the exact stall requested.
  */
  test("should list all stalls and fetch a single stall by id", async () => {
    const stallId = await insertTestStall();

    const listResponse = await request(app)
      .get("/api/operator/stalls")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(listResponse.statusCode).toBe(200);
    expect(Array.isArray(listResponse.body)).toBe(true);
    expect(listResponse.body.length).toBeGreaterThan(0);

    const singleResponse = await request(app)
      .get(`/api/operator/stalls/${stallId}`)
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(singleResponse.statusCode).toBe(200);
    expect(singleResponse.body.stall_id).toBe(stallId);
  });

  /*
    Test case 5:
    Requesting a stall id that doesn't exist should 404, not crash or
    silently return an empty 200.

    Expected result:
    - HTTP status 404.
  */
  test("should return 404 for a non-existent stall id", async () => {
    const response = await request(app)
      .get("/api/operator/stalls/999999")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.statusCode).toBe(404);
  });

  /*
    Test case 6:
    Updating an existing stall with valid data should persist the change.

    Expected result:
    - HTTP status 200.
    - The updated fields are reflected in the response.
  */
  test("should update an existing stall record", async () => {
    const stallId = await insertTestStall();

    const response = await request(app)
      .put(`/api/operator/stalls/${stallId}`)
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        vendor_id: validVendorId,
        stall_name: "Updated By Jest",
        hawker_centre_id: validHawkerCentreId,
        cuisine_type: "Updated Cuisine"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.stall_name).toBe("Updated By Jest");
    expect(response.body.cuisine_type).toBe("Updated Cuisine");
  });

  /*
    Test case 7:
    Updating a stall id that doesn't exist should 404.

    Expected result:
    - HTTP status 404.
  */
  test("should return 404 when updating a non-existent stall", async () => {
    const response = await request(app)
      .put("/api/operator/stalls/999999")
      .set("Authorization", `Bearer ${operatorToken}`)
      .send({
        vendor_id: validVendorId,
        stall_name: "Should Not Apply",
        hawker_centre_id: validHawkerCentreId
      });

    expect(response.statusCode).toBe(404);
  });

  /*
    Test case 8:
    Deactivating a stall should mark it inactive (is_active = 0) rather
    than deleting the row - the record must still be fetchable afterward.

    Expected result:
    - HTTP status 200 on deactivate.
    - A follow-up GET still finds the stall, now with is_active = false.
  */
  test("should deactivate a stall instead of deleting it", async () => {
    const stallId = await insertTestStall();

    const deactivateResponse = await request(app)
      .delete(`/api/operator/stalls/${stallId}`)
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(deactivateResponse.statusCode).toBe(200);

    const followUp = await request(app)
      .get(`/api/operator/stalls/${stallId}`)
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(followUp.statusCode).toBe(200);
    expect(followUp.body.is_active).toBe(false);
  });

  /*
    Test case 9:
    Deactivating a stall id that doesn't exist should 404.

    Expected result:
    - HTTP status 404.
  */
  test("should return 404 when deactivating a non-existent stall", async () => {
    const response = await request(app)
      .delete("/api/operator/stalls/999999")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.statusCode).toBe(404);
  });

  /*
    Test case 10:
    No token at all should be rejected as unauthenticated, not authorized.

    Expected result:
    - HTTP status 401.
  */
  test("should reject requests with no token", async () => {
    const response = await request(app).get("/api/operator/stalls");

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 11:
    A logged-in vendor or patron is a real user, just the wrong role for
    this resource - that's a 403, not a 401.

    Expected result:
    - HTTP status 403 for both vendor and patron tokens.
  */
  test("should reject non-operator roles with 403", async () => {
    const vendorResponse = await request(app)
      .get("/api/operator/stalls")
      .set("Authorization", `Bearer ${vendorToken}`);

    const patronResponse = await request(app)
      .get("/api/operator/stalls")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(vendorResponse.statusCode).toBe(403);
    expect(patronResponse.statusCode).toBe(403);
  });
});
