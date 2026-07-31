const request = require("supertest");
const app = require("../app");
const { getVendorToken, getPatronToken } = require("./testHelpers");

describe("Vendor Dashboard API Tests", () => {
  let vendorToken;
  let patronToken;

  beforeAll(async () => {
    vendorToken = await getVendorToken();
    patronToken = await getPatronToken();
  });

  test("should get dashboard summary for logged-in vendor", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("todayRevenue");
    expect(response.body).toHaveProperty("todayOrders");
    expect(response.body).toHaveProperty("pendingOrders");
    expect(response.body).toHaveProperty("averageRating");
    expect(Array.isArray(response.body.recentOrders)).toBe(true);
    expect(Array.isArray(response.body.weeklyRevenue)).toBe(true);
    expect(Array.isArray(response.body.topSellingDishes)).toBe(true);
  });

  test("should reject request without token", async () => {
    const response = await request(app).get("/api/vendor/dashboard");
    expect(response.statusCode).toBe(401);
  });

  test("should reject patron from accessing vendor dashboard", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
  });

  // BED-73: month/year filter
  test("should accept a valid past month/year filter", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard?month=6&year=2026")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("todayRevenue");
  });

  test("should reject an out-of-range month with 400", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard?month=13&year=2026")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(400);
  });

  test("should reject a future month with 400", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard?month=12&year=2099")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(400);
  });

  test("should reject month provided without year", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard?month=6")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(400);
  });

  // Guards against the fake-data regression this file exists to catch.
  test("should never return the old hardcoded demo values", async () => {
    const response = await request(app)
      .get("/api/vendor/dashboard")
      .set("Authorization", `Bearer ${vendorToken}`);

    const names = response.body.recentOrders.map((o) => o.customer_name);
    expect(names).not.toContain("Aisha Rahman");

    const dishes = response.body.topSellingDishes.map((d) => d.item_name);
    expect(dishes).not.toContain("Chicken Rice");
  });
});
