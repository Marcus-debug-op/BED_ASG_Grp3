const request = require("supertest");
const app = require("../app");
const {
  getPatronToken,
  getVendorToken,
  getVendorTestMenuItem
} = require("./testHelpers");

/*
  This file tests the Patron Order features that I built.

  Main purpose:
  - Check that a patron can create an order.
  - Check that a patron can view their order status, history, and details.
  - Check that invalid input and wrong ids are handled safely.
  - Check that routes are protected (no token = blocked, wrong role = forbidden).

  Endpoints tested:
  POST /api/orders
  GET  /api/orders/history
  GET  /api/orders/:id/status
  GET  /api/orders/:id

  How it works:
  - Supertest sends fake HTTP requests to the Express app (no browser needed).
  - A patron token is generated from a seeded user, so the login page isn't needed.
  - beforeAll creates one real order first, so the read tests have something to fetch.
*/

describe("Patron Order API Tests", () => {
  let patronToken;
  let vendorToken;
  let testOrderData;   // { stall_id, menu_item_id } from a seeded stall
  let createdOrderId;  // id of the order created in beforeAll, reused by read tests

  /*
    Runs once before all tests:
    1. Get a patron token (and a vendor token for the wrong-role test).
    2. Find a valid stall + menu item to order from.
    3. Create one order and remember its id.
  */
  beforeAll(async () => {
    patronToken = await getPatronToken();
    vendorToken = await getVendorToken();
    testOrderData = await getVendorTestMenuItem();

    const createResponse = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: testOrderData.stall_id,
        items: [{ menu_item_id: testOrderData.menu_item_id, quantity: 1 }]
      });

    createdOrderId = createResponse.body.order.order_id;
  });

  // ---------- CREATE ----------

  // Success: a valid order should be created and return 201.
  test("POST /api/orders creates an order for a logged-in patron", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: testOrderData.stall_id,
        items: [{ menu_item_id: testOrderData.menu_item_id, quantity: 2 }]
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.order).toHaveProperty("order_id");
  });

  // Failure: an empty items array is invalid input and should be rejected.
  test("POST /api/orders rejects an order with no items", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({ stall_id: testOrderData.stall_id, items: [] });

    expect(res.statusCode).toBe(400);
  });

  // Security: no token means the route must block the request.
  test("POST /api/orders is blocked without a token", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({
        stall_id: testOrderData.stall_id,
        items: [{ menu_item_id: testOrderData.menu_item_id, quantity: 1 }]
      });

    expect(res.statusCode).toBe(401);
  });

  // Security: a vendor token must not be allowed on a patron-only route.
  test("POST /api/orders is forbidden for a vendor", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({
        stall_id: testOrderData.stall_id,
        items: [{ menu_item_id: testOrderData.menu_item_id, quantity: 1 }]
      });

    expect(res.statusCode).toBe(403);
  });

  // ---------- READ: HISTORY ----------

  // Success: history returns 200 and an "orders" array.
  test("GET /api/orders/history returns the patron's orders", async () => {
    const res = await request(app)
      .get("/api/orders/history")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  // ---------- READ: STATUS ----------

  // Success: the order we created should return its status.
  test("GET /api/orders/:id/status returns the order status", async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}/status`)
      .set("Authorization", `Bearer ${patronToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("order_status");
  });

  // Failure: an order id that doesn't exist should return 404.
  test("GET /api/orders/:id/status returns 404 for a missing order", async () => {
    const res = await request(app)
      .get("/api/orders/999999/status")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(res.statusCode).toBe(404);
  });

  // Failure: a non-numeric id is invalid input and should return 400.
  test("GET /api/orders/:id/status returns 400 for an invalid id", async () => {
    const res = await request(app)
      .get("/api/orders/abc/status")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(res.statusCode).toBe(400);
  });

  // ---------- READ: DETAILS ----------

  // Success: details returns the order plus its line items.
  test("GET /api/orders/:id returns the order with its items", async () => {
    const res = await request(app)
      .get(`/api/orders/${createdOrderId}`)
      .set("Authorization", `Bearer ${patronToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("order");
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  // Failure: a missing order id should return 404.
  test("GET /api/orders/:id returns 404 for a missing order", async () => {
    const res = await request(app)
      .get("/api/orders/999999")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(res.statusCode).toBe(404);
  });
});