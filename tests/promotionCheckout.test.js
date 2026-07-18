const request = require("supertest");
const app = require("../app");
const {
  getPatronToken,
  insertTestStall,
  insertTestMenuItem,
  insertTestPromotion,
  SECOND_VENDOR_EMAIL
} = require("./testHelpers");

/*
  This file tests Promotion Application and Redemption Tracking during
  checkout (BED-22 / BED-46).

  Main purpose:
  - Check that an order rejects a promo code that doesn't exist, is
    inactive, is expired, or doesn't meet the minimum spend - each with
    its own specific reason/message.
  - Check that a VALID promo code has its discount calculated on the
    server (never trusting a client-supplied amount) and applied to the
    order total.
  - Check that a single-use code can't be redeemed twice by the same patron.
  - Check that a promo code belonging to a different stall is rejected as
    "not found" for this stall (per-stall scoping, per BED-47).

  This tests:
  POST /api/orders  (with promo_code)

  Important:
  - Uses insertTestStall() to create fresh, disposable stalls per test run
    rather than reusing the shared demo stalls (which carry seeded
    promotions like BEANCURD10/LAKSA15) - keeps these tests fully isolated
    from seed data and from any previous run's leftover data.
  - Uses insertTestMenuItem() to control the exact unit price, so the
    order subtotal is deterministic (needed for min-spend and exact
    discount-amount checks).
  - Uses insertTestPromotion() to insert promotion fixtures directly,
    bypassing the vendor create-API's overlap/duplicate checks entirely.
*/

describe("Promotion Application & Redemption API Tests", () => {
  let patronToken;
  let stallId;
  let secondStallId;
  let cheapItem; // $5.00 - used for most tests
  let minSpendItem; // $50.00 - used to test min_spend_amount rejection

  beforeAll(async () => {
    patronToken = await getPatronToken();

    stallId = await insertTestStall();
    secondStallId = await insertTestStall(SECOND_VENDOR_EMAIL);

    cheapItem = await insertTestMenuItem(stallId, 5.0);
    minSpendItem = await insertTestMenuItem(stallId, 50.0);
  });

  function orderPayload(menuItemId, promoCode) {
    return {
      stall_id: stallId,
      items: [{ menu_item_id: menuItemId, quantity: 1 }],
      ...(promoCode ? { promo_code: promoCode } : {})
    };
  }

  /*
    Test case 1:
    A promo code that doesn't exist for this stall should be rejected.

    Expected result:
    - HTTP status 400.
    - reason: "NOT_FOUND".
  */
  test("should reject an order with a non-existent promo code", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, `NOPE${Date.now()}`));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("NOT_FOUND");
  });

  /*
    Test case 2:
    An inactive promo code should be rejected.

    Expected result:
    - HTTP status 400.
    - reason: "INACTIVE".
  */
  test("should reject an inactive promo code", async () => {
    const promo = await insertTestPromotion(stallId, { is_active: 0 });

    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("INACTIVE");
  });

  /*
    Test case 3:
    A promo code outside its date range (already expired) should be rejected.

    Expected result:
    - HTTP status 400.
    - reason: "EXPIRED".
  */
  test("should reject an expired promo code", async () => {
    const promo = await insertTestPromotion(stallId, {
      start_date: "2020-01-01",
      end_date: "2020-01-31"
    });

    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("EXPIRED");
  });

  /*
    Test case 4:
    A promo code with a minimum spend requirement should be rejected if the
    order subtotal doesn't meet it.

    Expected result:
    - HTTP status 400.
    - reason: "MIN_SPEND_NOT_MET".
  */
  test("should reject a promo code when the order doesn't meet minimum spend", async () => {
    const promo = await insertTestPromotion(stallId, { min_spend_amount: 100.0 });

    // cheapItem is $5.00, well under the $100 minimum spend.
    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("MIN_SPEND_NOT_MET");
  });

  /*
    Test case 4b:
    A promo code with a minimum spend requirement SHOULD apply when the
    order subtotal meets or exceeds it.

    Expected result:
    - HTTP status 201.
    - Discount applied.
  */
  test("should apply a promo code when minimum spend is met", async () => {
    const promo = await insertTestPromotion(stallId, {
      discount_percent: 5,
      min_spend_amount: 40.0
    });

    // minSpendItem is $50.00, which meets the $40 minimum spend.
    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(minSpendItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(201);
    expect(response.body.promotion).not.toBeNull();
    expect(response.body.promotion.discount_amount).toBe(2.5);
  });

  /*
    Test case 5:
    A valid promo code should have its discount calculated on the server
    and applied to the order total.

    Expected result:
    - HTTP status 201.
    - response.promotion.discount_amount = exactly 20% of the $5.00 subtotal ($1.00).
    - response.order.total_amount = subtotal minus that discount ($4.00).
  */
  test("should apply a valid promo code and calculate the exact server-side discount", async () => {
    const promo = await insertTestPromotion(stallId, { discount_percent: 20 });

    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(201);
    expect(response.body.promotion).not.toBeNull();
    expect(response.body.promotion.discount_amount).toBe(1.0);
    expect(Number(response.body.order.total_amount)).toBe(4.0);
  });

  /*
    Test case 6:
    A single-use promo code can't be redeemed twice by the same patron.

    Expected result:
    - First order: HTTP status 201, promo applied.
    - Second order with the same code: HTTP status 400, reason "ALREADY_REDEEMED".
  */
  test("should reject reusing a promo code the patron already redeemed", async () => {
    const promo = await insertTestPromotion(stallId, { discount_percent: 10 });

    const firstResponse = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(secondResponse.statusCode).toBe(400);
    expect(secondResponse.body.reason).toBe("ALREADY_REDEEMED");
  });

  /*
    Test case 7:
    A promo code that exists but belongs to a DIFFERENT stall should be
    treated as not found for this stall (per-stall scoping, per BED-47's
    "for their stall" acceptance criteria).

    Expected result:
    - HTTP status 400.
    - reason: "NOT_FOUND".
  */
  test("should reject a promo code that belongs to a different stall", async () => {
    const promoOnOtherStall = await insertTestPromotion(secondStallId, {});

    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, promoOnOtherStall.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("NOT_FOUND");
  });

  /*
    Test case 8:
    An order placed WITHOUT a promo code should still succeed normally
    (promo_code is optional) and shouldn't carry a promotion.

    Expected result:
    - HTTP status 201.
    - response.promotion is null.
  */
  test("should still succeed when no promo code is given", async () => {
    const response = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(orderPayload(cheapItem.menu_item_id, null));

    expect(response.statusCode).toBe(201);
    expect(response.body.promotion).toBeNull();
  });
});