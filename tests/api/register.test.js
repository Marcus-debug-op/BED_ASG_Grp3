const request = require("supertest");
const app = require("../../app");


/* This file tests the registration APIs.
  Main purpose:
  - Check that invalid patron/vendor registration data is rejected.
  - Check that valid patron/vendor registration data is accepted.
  - These are POST tests because registration creates new users in the database.

  Important:
  - Successful registration tests will insert test users into the real database.
  - That is why unique emails and unique stall unit numbers are used.
*/

describe("Patron Registration API Tests", () => {

    /*
    Test case 1:
    Patron phone number must be a valid Singapore phone number.

    Expected result:
    - Backend should reject phone numbers that do not start with 6, 8, or 9.
    - HTTP status should be 400 Bad Request.
  */

  test("should reject patron registration with invalid phone number", async () => {
    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Test Patron",
        email: "testpatron1@gmail.com",
        phone_number: "12345678", //Bad handphone number input (Will pass if it detects this)
        password: "Password123!",
        confirm_password: "Password123!"
      });

      console.log("Patron register response:", response.statusCode, response.body);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("message");
  });

 /*
    Test case 2:
    Patron password must follow the password rules.

    Expected result:
    - Weak password should be rejected.
    - HTTP status should be 400 Bad Request.
  */

  test("should reject patron registration with weak password", async () => {
    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Test Patron",
        email: "testpatron2@gmail.com",
        phone_number: "81234567",
        password: "password", //Bad input(Will pass if detected)
        confirm_password: "password"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 3:
    Password and confirm password must match.

    Expected result:
    - Backend should reject mismatched passwords.
    - HTTP status should be 400 Bad Request.
  */

  test("should reject patron registration when passwords do not match", async () => {
    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Test Patron",
        email: "testpatron3@gmail.com",
        phone_number: "81234567",
        password: "Password123!",
        confirm_password: "Different123!" //mismatched passwords(Pass if detected)
      });

      console.log("Vendor register response:", response.statusCode, response.body);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 4:
    Valid patron registration should work.

    Expected result:
    - Backend should create a new patron account.
    - HTTP status should be 201 Created.

    Why Date.now() is used:
    - Email must be unique in the Users table.
    - Date.now() prevents duplicate email errors when running tests multiple times.
  */


  test("should register a patron successfully", async () => {
    const uniqueEmail = `patron${Date.now()}@gmail.com`;

    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Jest Test Patron",
        email: uniqueEmail,
        phone_number: "81234567",
        password: "Password123!",
        confirm_password: "Password123!"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("message");
  });
});



describe("Vendor Registration API Tests", () => {
    /*
    Test case 1:
    Vendor phone number must be valid.

    Expected result:
    - Invalid phone number should be rejected.
    - HTTP status should be 400 Bad Request.
  */
  test("should reject vendor registration with invalid phone number", async () => {
    const response = await request(app)
      .post("/api/auth/register/vendor")
      .send({
        full_name: "Test Vendor",
        email: "testvendor1@gmail.com",
        phone_number: "12345678", //Bad input
        password: "Password123!",
        confirm_password: "Password123!",
        stall_name: "Test Stall",
        cuisine_type: "Local Food",
        description: "This is a test stall",
        unit_number: "#01-01",
        hawker_centre_id: 1
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

   /*
    Test case 2:
    Vendor registration requires a stall name.

    Expected result:
    - Missing stall name should be rejected.
    - HTTP status should be 400 Bad Request.
  */
  test("should reject vendor registration with missing stall name", async () => {
    const response = await request(app)
      .post("/api/auth/register/vendor")
      .send({
        full_name: "Test Vendor",
        email: "testvendor2@gmail.com",
        phone_number: "81234567",
        password: "Password123!",
        confirm_password: "Password123!",
        stall_name: "", //Empty input
        cuisine_type: "Local Food",
        description: "This is a test stall",
        unit_number: "#01-01",
        hawker_centre_id: 1
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

   /*
    Test case 3:
    Vendor registration requires a hawker centre.

    Expected result:
    - Missing hawker_centre_id should be rejected.
    - HTTP status should be 400 Bad Request.
  */
  test("should reject vendor registration with missing hawker centre", async () => {
    const response = await request(app)
      .post("/api/auth/register/vendor")
      .send({
        full_name: "Test Vendor",
        email: "testvendor3@gmail.com",
        phone_number: "81234567",
        password: "Password123!",
        confirm_password: "Password123!",
        stall_name: "Test Stall",
        cuisine_type: "Local Food",
        description: "This is a test stall",
        unit_number: "#01-01"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 4:
    Valid vendor registration should work.

    Expected result:
    - Backend should create a new vendor user.
    - Backend should also create a stall linked to that vendor.
    - HTTP status should be 201 Created.

    Why uniqueValue is used:
    - email must be unique in Users.
    - unit_number must be unique in Stalls.
    - Without unique values, repeated test runs can fail with duplicate key errors.
  */
  test("should register a vendor successfully", async () => {
    const uniqueValue = Date.now();
    const uniqueEmail = `vendor${uniqueValue}@gmail.com`;
    const uniqueUnitNumber = `#T-${uniqueValue}`;

    const response = await request(app)
      .post("/api/auth/register/vendor")
      .send({
        full_name: "Jest Test Vendor",
        email: uniqueEmail,
        phone_number: "91234567",
        password: "Password123!",
        confirm_password: "Password123!",
        stall_name: `Jest Test Stall ${uniqueValue}`,
        cuisine_type: "Western Food",
        description: "This stall was created during Jest testing",
        unit_number: uniqueUnitNumber,
        hawker_centre_id: 1
      });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("user_id");
      expect(response.body).toHaveProperty("stall_id");
    });
});