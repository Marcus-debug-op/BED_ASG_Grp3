const request = require("supertest");
const app = require("../app");
const { getVendorToken, getPatronToken } = require("./testHelpers");

/*
  This file tests the Vendor Profile Business Details section.

  Main purpose:
  - The Vendor Profile page has a Business Details summary.
  - That section uses GET /api/vendor/my-stalls.
  - This test checks whether the backend returns the vendor's stall details correctly.

  This is NOT testing menu items.
  This is testing vendor stall/business summary data.

  Tested route:
  GET /api/vendor/my-stalls
*/

describe("Vendor Profile Business Details API Tests", () => {
  let vendorToken;
  let patronToken;

  /*
    Get both vendor and patron tokens.

    Why both are needed:
    - vendorToken is used to prove that vendors can access the route.
    - patronToken is used to prove that patrons cannot access the vendor-only route.
  */
  beforeAll(async () => {
    vendorToken = await getVendorToken();
    patronToken = await getPatronToken();
  });

  /*
    Test case 1:
    Logged-in vendor should be able to view their own stall/business details.

    Expected result:
    - HTTP status 200.
    - Response should be an array.
    - If there are stalls, each stall should have key business detail fields.
  */
  test("should get stall business details for logged-in vendor profile", async () => {
    const response = await request(app)
      .get("/api/vendor/my-stalls")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty("stall_name");
      expect(response.body[0]).toHaveProperty("centre_name");
      expect(response.body[0]).toHaveProperty("cuisine_type");
      expect(response.body[0]).toHaveProperty("unit_number");
    }
  });

  /*
    Test case 2:
    User should not access vendor business details without logging in.

    Expected result:
    - No token means unauthorized.
    - HTTP status 401.
  */
  test("should reject vendor business details request without token", async () => {
    const response = await request(app)
      .get("/api/vendor/my-stalls");

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 3:
    Patron should not access vendor-only business details.

    Expected result:
    - Patron token should be rejected.
    - HTTP status 403 Forbidden.
  */
  test("should reject patron from accessing vendor business details", async () => {
    const response = await request(app)
      .get("/api/vendor/my-stalls")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
  });
});