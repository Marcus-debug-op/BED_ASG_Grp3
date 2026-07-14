const request = require("supertest");
const app = require("../app");

describe("Auth API Tests", () => {
  test("should reject patron registration with invalid phone number", async () => {
    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Test Patron",
        email: "badphone@example.com",
        phone_number: "81234abc",
        password: "Testpatron123!",
        confirm_password: "Testpatron123!"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("should reject patron registration with weak password", async () => {
    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Test Patron",
        email: "weakpassword@example.com",
        phone_number: "81234567",
        password: "benisapatron",
        confirm_password: "benisapatron"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  test("should reject patron registration when passwords do not match", async () => {
    const response = await request(app)
      .post("/api/auth/register/patron")
      .send({
        full_name: "Test Patron",
        email: "mismatch@example.com",
        phone_number: "81234567",
        password: "Testpatron123!",
        confirm_password: "Different123!"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});