const request = require("supertest");
const app = require("../app");

describe("Vendor Registration Validation Tests", () => {

  test("should reject vendor registration with invalid phone number", async () => {
    /*
      What we are testing:
      The phone number has letters: "91234abc"

      Expected backend behavior:
      Backend should reject this request because phone number must be numbers only
      and must be 8 digits starting with 6, 8, or 9.

      Expected test result:
      This Jest test should PASS if the backend returns 400.
    */

    const response = await request(app)
      .post("/api/auth/register/vendor")
      .send({
        full_name: "Test Vendor",
        email: "vendorbadphone@example.com",
        phone_number: "91234abc",
        password: "Vendorpass123!",
        confirm_password: "Vendorpass123!",
        stall_name: "Test Stall",
        cuisine_type: "Local Food",
        description: "Selling local food.",
        unit_number: "#01-99",
        hawker_centre_id: 1
      });

    // We EXPECT the backend to reject the bad phone number
    expect(response.statusCode).toBe(400);

    // We EXPECT the backend to return an error message
    expect(response.body).toHaveProperty("message");
  });


  test("should reject vendor registration with missing hawker centre", async () => {
    /*
      What we are testing:
      The request does not include hawker_centre_id.

      Expected backend behavior:
      Backend should reject this request because vendor registration
      needs a hawker centre selected.

      Expected test result:
      This Jest test should PASS if the backend returns 400.
    */

    const response = await request(app)
      .post("/api/auth/register/vendor")
      .send({
        full_name: "Test Vendor",
        email: "vendornocentre@example.com",
        phone_number: "91234567",
        password: "Vendorpass123!",
        confirm_password: "Vendorpass123!",
        stall_name: "Test Stall",
        cuisine_type: "Local Food",
        description: "Selling local food.",
        unit_number: "#01-99"

        // hawker_centre_id is intentionally missing here
      });

    // We EXPECT the backend to reject the missing hawker centre
    expect(response.statusCode).toBe(400);

    // We EXPECT the backend to return an error message
    expect(response.body).toHaveProperty("message");
  });

});