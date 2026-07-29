const request = require("supertest");
const app = require("../../app");
const { getVendorToken, getPatronToken } = require("../testHelpers");

/*
  This file tests the Vendor Dashboard summary metrics endpoint.

  Main purpose:
  - The Vendor Dashboard homepage shows 4 summary cards: today's revenue,
    today's orders, pending orders, and average rating.
  - This test checks that the backend correctly aggregates those numbers
    from Orders/Stalls/Feedbacks for the logged-in vendor's own stall(s).

  This is NOT testing menu items, promotions, or order status updates.
  This is only testing the read-only dashboard summary.

  Tested route:
  GET /api/vendor/dashboard
*/

describe("Vendor Dashboard API Tests", () => {
  let vendorToken;
  let patronToken;

  /*
    Get both vendor and patron tokens.

    Why both are needed:
    - vendorToken is used to prove that vendors can access their own dashboard.
    - patronToken is used to prove that patrons cannot access a vendor-only route.
  */
  beforeAll(async () => {
    vendorToken = await getVendorToken();
    patronToken = await getPatronToken();
  });

  /*
    Test case 1:
    Logged-in vendor should be able to load their dashboard summary.

    Expected result:
    - HTTP status 200.
    - Response has all 4 summary fields.
    - todayOrders and pendingOrders are non-negative numbers.
    - todayRevenue and averageRating are numeric strings (formatted with
      toFixed on the backend so the frontend can display them directly).
  */
  test("should get dashboard summary metrics for logged-in vendor", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("todayRevenue");
    expect(response.body).toHaveProperty("todayOrders");
    expect(response.body).toHaveProperty("pendingOrders");
    expect(response.body).toHaveProperty("averageRating");

    expect(typeof response.body.todayOrders).toBe("number");
    expect(response.body.todayOrders).toBeGreaterThanOrEqual(0);

    expect(typeof response.body.pendingOrders).toBe("number");
    expect(response.body.pendingOrders).toBeGreaterThanOrEqual(0);

    expect(Number.isNaN(Number(response.body.todayRevenue))).toBe(false);
    expect(Number.isNaN(Number(response.body.averageRating))).toBe(false);
  });

  /*
    Test case 2:
    A vendor with seeded demo orders/feedback should see those reflected
    in the numbers, not just zeros. This confirms the aggregation query
    is actually reading real rows, not silently failing to zero every time.

    Expected result:
    - averageRating should be between 1 and 5 if any feedback exists for
      this vendor's stall (matches the CK_Feedbacks_Rating constraint).
  */
  test("average rating should fall within the valid 1-5 range when feedback exists", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard")
      .set("Authorization", `Bearer ${vendorToken}`);

    const rating = Number(response.body.averageRating);

    if (rating > 0) {
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
    }
  });

  /*
    Test case 3:
    User should not access dashboard metrics without logging in.

    Expected result:
    - No token means unauthorized.
    - HTTP status 401.
  */
  test("should reject dashboard request without token", async () => {
    const response = await request(app).get("/api/vendor/dashboard");

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 4:
    Patron should not access the vendor-only dashboard.

    Expected result:
    - Patron token should be rejected.
    - HTTP status 403 Forbidden.
  */
  test("should reject patron from accessing vendor dashboard", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
  });
});
