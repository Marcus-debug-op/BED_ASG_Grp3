const request = require("supertest");
const app = require("../../app");
const {
  getVendorToken,
  getPatronToken,
  getVendorTestMenuItem
} = require("../testHelpers");

/*
  This file tests the Vendor Order feature.

  Main purpose:
  - Check that vendors can receive/view customer orders from their stalls.
  - Check that only vendors can access vendor order routes.
  - Check that vendors can update order status.
  - Check that invalid order status is rejected.

  This tests:
  GET /api/orders/vendor/my-orders
  PUT /api/orders/vendor/my-orders/:orderId/status

  Important:
  - To test vendor receiving orders, the test first creates a customer order.
  - The customer order is created using a patron token.
  - Then the vendor token is used to view and update that order.
*/

describe("Vendor Order API Tests", () => {
  let vendorToken;
  let patronToken;
  let createdOrderId;
  let testOrderData;

  /*
    beforeAll runs once before the tests.

    Steps:
    1. Get vendor token.
    2. Get patron token.
    3. Find or create one available menu item under the vendor's stall.
    4. Create one customer order using the patron account.
    5. Store the created order ID for later update-status tests.
  */
  beforeAll(async () => {
    vendorToken = await getVendorToken();
    patronToken = await getPatronToken();
    testOrderData = await getVendorTestMenuItem();

    const createResponse = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: testOrderData.stall_id,
        items: [
          {
            menu_item_id: testOrderData.menu_item_id,
            quantity: 2
          }
        ]
      });

    if (createResponse.statusCode === 201) {
      createdOrderId = createResponse.body.order.order_id;
    } else {
      console.log("Create order failed:", createResponse.statusCode, createResponse.body);
    }
  });

  /*
    Test case 1:
    Vendor should be able to view orders from their own stalls.

    Expected result:
    - HTTP status 200.
    - Response should be an array of orders.
  */
  test("should allow vendor to get orders from their stalls", async () => {
    const response = await request(app)
      .get("/api/orders/vendor/my-orders")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  /*
    Test case 2:
    User should not access vendor orders without logging in.

    Expected result:
    - No token means unauthorized.
    - HTTP status 401.
  */
  test("should reject vendor orders request without token", async () => {
    const response = await request(app)
      .get("/api/orders/vendor/my-orders");

    expect(response.statusCode).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 3:
    Patron should not access vendor order management.

    Expected result:
    - Patron token should be rejected.
    - HTTP status 403 Forbidden.
  */
  test("should reject patron from accessing vendor orders", async () => {
    const response = await request(app)
      .get("/api/orders/vendor/my-orders")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 4:
    Vendor should not be allowed to update order status to an invalid value.

    Example:
    - "Cooking" is not one of the allowed statuses.

    Expected result:
    - HTTP status 400 Bad Request.
  */
  test("should reject invalid vendor order status", async () => {
    expect(createdOrderId).toBeDefined();

    const response = await request(app)
      .put(`/api/orders/vendor/my-orders/${createdOrderId}/status`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({
        order_status: "Cooking"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 5:
    Vendor should be able to update order status to a valid value.

    Expected result:
    - HTTP status 200.
    - Response should show the updated status.
  */
  test("should allow vendor to update order status", async () => {
    expect(createdOrderId).toBeDefined();

    const response = await request(app)
      .put(`/api/orders/vendor/my-orders/${createdOrderId}/status`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({
        order_status: "Preparing"
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty("message");
    expect(response.body.order.order_status).toBe("Preparing");
  });
});