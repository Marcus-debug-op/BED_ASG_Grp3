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
  This file tests the checkout "Apply" promo preview (BED-92):
  POST /api/orders/preview-promo

  Main purpose:
  - Check that a preview reports the exact same validation reasons as a
    real checkout (NOT_FOUND, INACTIVE, EXPIRED, MIN_SPEND_NOT_MET) - so
    the checkout page never shows a discount it can't actually redeem.
  - Check that a VALID code returns the exact server-calculated discount
    and discounted total, matching what a real checkout would charge.
  - Check that previewing the SAME code any number of times never
    consumes it - i.e. it never records a redemption, and a real checkout
    afterwards still succeeds.
  - Check that an already-redeemed code is correctly reported as such by
    the preview too.
  - Check that an invalid item / missing fields are rejected the same way
    order creation rejects them.

  Uses the same fixtures/helpers as promotionCheckout.test.js
  (insertTestStall/insertTestMenuItem/insertTestPromotion) so this stays
  fully isolated from seed data and from promotionCheckout.test.js's own
  fixtures.
*/

describe("Promo Preview API Tests (BED-92)", () => {
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

  function previewPayload(menuItemId, promoCode, sid = stallId) {
    return {
      stall_id: sid,
      items: [{ menu_item_id: menuItemId, quantity: 1 }],
      promo_code: promoCode
    };
  }

  /*
    Test case 1:
    A promo code that doesn't exist for this stall should be rejected.

    Expected result:
    - HTTP status 400.
    - reason: "NOT_FOUND".
  */
  test("should reject a preview for a non-existent promo code", async () => {
    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, `NOPE${Date.now()}`));

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
  test("should reject a preview for an inactive promo code", async () => {
    const promo = await insertTestPromotion(stallId, { is_active: 0 });

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("INACTIVE");
  });

  /*
    Test case 3:
    An expired promo code should be rejected.

    Expected result:
    - HTTP status 400.
    - reason: "EXPIRED".
  */
  test("should reject a preview for an expired promo code", async () => {
    const promo = await insertTestPromotion(stallId, {
      start_date: "2020-01-01",
      end_date: "2020-01-31"
    });

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("EXPIRED");
  });

  /*
    Test case 4:
    A promo code with a minimum spend requirement should be rejected if
    the cart subtotal doesn't meet it, but the response should still
    surface the computed subtotal so the frontend can explain why.

    Expected result:
    - HTTP status 400.
    - reason: "MIN_SPEND_NOT_MET".
    - subtotal: 5 (the cheap item's price).
  */
  test("should reject a preview when the cart doesn't meet minimum spend", async () => {
    const promo = await insertTestPromotion(stallId, { min_spend_amount: 100.0 });

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("MIN_SPEND_NOT_MET");
    expect(Number(response.body.subtotal)).toBe(5);
  });

  /*
    Test case 5:
    A valid promo code should return the exact server-side discount and
    discounted total for the cart, matching what checkout would charge.

    Expected result:
    - HTTP status 200.
    - valid: true.
    - discount_amount = exactly 20% of the $5.00 subtotal ($1.00).
    - discounted_total = $4.00.
  */
  test("should return the exact discount for a valid promo code", async () => {
    const promo = await insertTestPromotion(stallId, { discount_percent: 20 });

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(Number(response.body.subtotal)).toBe(5);
    expect(Number(response.body.discount_amount)).toBe(1.0);
    expect(Number(response.body.discounted_total)).toBe(4.0);
  });

  /*
    Test case 6:
    Previewing a valid code (even repeatedly) must NEVER record a
    redemption - a real checkout with the same code afterwards should
    still succeed, and a second real checkout should THEN correctly fail
    as already-redeemed.

    Expected result:
    - Two previews in a row both return 200/valid: true.
    - The real checkout afterwards still succeeds (201).
    - A second real checkout with the same code now fails as
      ALREADY_REDEEMED - proving only the real checkout redeemed it, not
      the previews.
  */
  test("previewing a code never consumes it - only a real checkout does", async () => {
    const promo = await insertTestPromotion(stallId, { discount_percent: 10 });

    const firstPreview = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));
    expect(firstPreview.statusCode).toBe(200);
    expect(firstPreview.body.valid).toBe(true);

    const secondPreview = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));
    expect(secondPreview.statusCode).toBe(200);
    expect(secondPreview.body.valid).toBe(true);

    const realCheckout = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: stallId,
        items: [{ menu_item_id: cheapItem.menu_item_id, quantity: 1 }],
        promo_code: promo.promo_code
      });
    expect(realCheckout.statusCode).toBe(201);
    expect(realCheckout.body.promotion).not.toBeNull();

    const previewAfterRedeemed = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promo.promo_code));
    expect(previewAfterRedeemed.statusCode).toBe(400);
    expect(previewAfterRedeemed.body.reason).toBe("ALREADY_REDEEMED");
  });

  /*
    Test case 7:
    A promo code that belongs to a DIFFERENT stall should preview as not
    found for this stall, same per-stall scoping as real checkout.

    Expected result:
    - HTTP status 400.
    - reason: "NOT_FOUND".
  */
  test("should reject a preview for a promo code that belongs to a different stall", async () => {
    const promoOnOtherStall = await insertTestPromotion(secondStallId, {});

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(cheapItem.menu_item_id, promoOnOtherStall.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.reason).toBe("NOT_FOUND");
  });

  /*
    Test case 7b:
    Previewing that same code directly against the stall it DOES belong
    to should succeed - confirms case 7 was genuinely about stall
    scoping, not a broken code.

    Expected result:
    - HTTP status 200, valid: true.
  */
  test("should accept a preview for that code against its real stall", async () => {
    const promoOnOtherStall = await insertTestPromotion(secondStallId, { discount_percent: 15 });
    const otherStallItem = await insertTestMenuItem(secondStallId, 10.0);

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(otherStallItem.menu_item_id, promoOnOtherStall.promo_code, secondStallId));

    expect(response.statusCode).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(Number(response.body.discount_amount)).toBe(1.5);
  });

  /*
    Test case 8:
    An invalid/unavailable menu item should be rejected the same way
    order creation rejects it, before the promo code is even checked.

    Expected result:
    - HTTP status 400.
    - message mentions the bad menu item id.
  */
  test("should reject a preview with an invalid menu item", async () => {
    const promo = await insertTestPromotion(stallId, {});
    const bogusMenuItemId = 999999999;

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(bogusMenuItemId, promo.promo_code));

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Invalid or unavailable menu item/);
  });

  /*
    Test case 9:
    promo_code is required for a preview (unlike order creation, where
    it's optional) - there's no reason to call this endpoint without one.

    Expected result:
    - HTTP status 400 (Joi validation failure), no DB call made.
  */
  test("should reject a preview with no promo_code", async () => {
    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: stallId,
        items: [{ menu_item_id: cheapItem.menu_item_id, quantity: 1 }]
      });

    expect(response.statusCode).toBe(400);
  });

  /*
    Test case 10:
    A promo code with a minimum spend requirement SHOULD preview as valid
    when the cart subtotal meets or exceeds it.

    Expected result:
    - HTTP status 200, valid: true.
  */
  test("should accept a preview when minimum spend is met", async () => {
    const promo = await insertTestPromotion(stallId, {
      discount_percent: 5,
      min_spend_amount: 40.0
    });

    const response = await request(app)
      .post("/api/orders/preview-promo")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(previewPayload(minSpendItem.menu_item_id, promo.promo_code));

    expect(response.statusCode).toBe(200);
    expect(response.body.valid).toBe(true);
    expect(Number(response.body.discount_amount)).toBe(2.5);
  });

  /*
    Test case 11:
    The preview endpoint requires patron authentication, same as order
    creation.

    Expected result:
    - HTTP status 401 with no token.
  */
  test("should reject a preview with no auth token", async () => {
    const response = await request(app)
      .post("/api/orders/preview-promo")
      .send(previewPayload(cheapItem.menu_item_id, "ANYCODE"));

    expect(response.statusCode).toBe(401);
  });
});
