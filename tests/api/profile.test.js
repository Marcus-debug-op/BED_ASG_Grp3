const request = require("supertest");
const app = require("../../app");
const { getPatronToken } = require("../testHelpers");

/*
  This file tests the Profile API.

  Main purpose:
  - Check that logged-in users can view their profile.
  - Check that users cannot view profile without a token.
  - Check that profile update validation works.
  - Check that a valid profile update works.

  This tests:
  GET /api/profile/my-profile
  PUT /api/profile/my-profile
*/

describe("Profile API Tests", () => {
  let patronToken;

  /*
    beforeAll runs once before all tests in this file.

    Purpose:
    - Get a valid patron JWT token.
    - The profile APIs require authentication.
  */
  beforeAll(async () => {
    patronToken = await getPatronToken();
  });

  /*
    Test case 1:
    Logged-in patron should be able to view their profile.

    Expected result:
    - HTTP status 200.
    - Response should include profile fields.
  */
  test("should get logged-in patron profile", async () => {
    const response = await request(app)
      .get("/api/profile/my-profile")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("full_name");
    expect(response.body).toHaveProperty("email");
    expect(response.body).toHaveProperty("phone_number");
  });

  /*
    Test case 2:
    User should not access profile without logging in.

    Expected result:
    - No token means unauthorized.
    - HTTP status 401.
  */
  test("should reject profile request without token", async () => {
    const response = await request(app)
      .get("/api/profile/my-profile");

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 3:
    Profile update should reject invalid phone number.

    Expected result:
    - Phone number with letters should be rejected.
    - HTTP status 400.
  */
  test("should reject profile update with invalid phone number", async () => {
    const response = await request(app)
      .put("/api/profile/my-profile")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        full_name: "Marcus Ng",
        phone_number: "81234abc"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 4:
    Profile update should work with valid details.

    Expected result:
    - HTTP status 200.
    - Response should contain updated phone number.
  */
  test("should update profile with valid details", async () => {
    const response = await request(app)
      .put("/api/profile/my-profile")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        full_name: "Marcus Ng",
        phone_number: "81112222"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.user.phone_number).toBe("81112222");
  });
});