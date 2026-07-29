const request = require("supertest");
const app = require("../../app");
const {
  getVendorToken,
  getPatronToken,
  insertTestStall,
  markPromotionAsUsed,
  SECOND_VENDOR_EMAIL
} = require("../testHelpers");

/*
  This file tests the Vendor Promotion Code Management feature (BED-47).

  Main purpose:
  - Check that a vendor can create/read/update promotion codes for their own stall.
  - Check that duplicate codes are blocked WITHIN a stall, but that two
    DIFFERENT stalls can use the same code (promo_code is now scoped
    UNIQUE(stall_id, promo_code), not globally unique - see migration 006).
  - Check that a vendor can never touch another vendor's stall promotions.
  - Check that toggling is_active updates the record without deleting it.
  - Check basic payload validation and auth/role enforcement.

  This tests:
  GET  /api/vendor/promotions/stall/:stallId
  POST /api/vendor/promotions/stall/:stallId
  GET  /api/vendor/promotions/:promotionId
  PUT  /api/vendor/promotions/:promotionId

  Important:
  - Uses insertTestStall() to create a FRESH stall per test run, rather than
    reusing the shared demo stall. That demo stall carries seeded
    promotions (e.g. an active BEANCURD10 covering all of 2026), which
    would otherwise collide with these tests' own wide date ranges via the
    overlapping-active-promotion rule - and a shared stall would also
    collide with whatever a PREVIOUS test run left behind, since nothing
    here gets cleaned up afterwards. A brand-new stall_id has nothing on
    it yet, so there's nothing to collide with.
  - Uses a timestamp-suffixed promo_code so repeated test runs never collide
    with a previous run's leftover data.
*/

describe("Vendor Promotion Management API Tests", () => {
  let vendorToken;
  let patronToken;
  let secondVendorToken;
  let stallId;
  let secondStallId;
  const uniqueCode = `SAVE${Date.now()}`;

  beforeAll(async () => {
    vendorToken = await getVendorToken();
    patronToken = await getPatronToken();
    secondVendorToken = await getVendorToken(SECOND_VENDOR_EMAIL);

    stallId = await insertTestStall();
    secondStallId = await insertTestStall(SECOND_VENDOR_EMAIL);
  });

  function validPromoPayload(overrides = {}) {
    return {
      promo_code: uniqueCode,
      description: "Jest test promo",
      discount_percent: 10,
      start_date: "2020-01-01",
      end_date: "2099-12-31",
      ...overrides
    };
  }

  /*
    Test case 1:
    A vendor should be able to create a promotion code for their own stall.

    Expected result:
    - HTTP status 201.
    - Response echoes back the created promo_code and stall_id.
  */
  let createdPromotionId;

  test("should allow a vendor to create a promotion for their own stall", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload());

    expect(response.statusCode).toBe(201);
    expect(response.body.promo_code).toBe(uniqueCode);
    expect(response.body.stall_id).toBe(stallId);

    createdPromotionId = response.body.promotion_id;
  });

  /*
    Test case 1b:
    A vendor should be able to set a minimum spend and a usage limit when
    creating a promotion - these are checked at checkout (BED-22) but were
    previously not accepted anywhere in the create/update API at all.

    Expected result:
    - HTTP status 201.
    - Response echoes back min_spend_amount and max_redemptions.
    - GET-ing the promotion back afterwards also includes them (proves the
      SELECT queries return these columns too, not just the INSERT).
  */
  test("should allow setting a minimum spend and usage limit on creation", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({
        promo_code: `MINSPEND${Date.now()}`,
        min_spend_amount: 15.5,
        max_redemptions: 20
      }));

    expect(response.statusCode).toBe(201);
    expect(Number(response.body.min_spend_amount)).toBe(15.5);
    expect(response.body.max_redemptions).toBe(20);

    const getResponse = await request(app)
      .get(`/api/vendor/promotions/${response.body.promotion_id}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(getResponse.statusCode).toBe(200);
    expect(Number(getResponse.body.min_spend_amount)).toBe(15.5);
    expect(getResponse.body.max_redemptions).toBe(20);
  });

  /*
    Test case 1c:
    Leaving minimum spend / usage limit blank should still work (they're
    optional) and should not be coerced into 0 or rejected.

    Expected result:
    - HTTP status 201.
    - min_spend_amount and max_redemptions are null.
  */
  test("should allow creating a promotion with no minimum spend or usage limit", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ promo_code: `NOMIN${Date.now()}` }));

    expect(response.statusCode).toBe(201);
    expect(response.body.min_spend_amount).toBeNull();
    expect(response.body.max_redemptions).toBeNull();
  });

  /*
    Test case 2:
    The SAME code should be rejected for the SAME stall (duplicate).

    Expected result:
    - HTTP status 400.
  */
  test("should reject a duplicate promo code within the same stall", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ start_date: "2030-01-01", end_date: "2030-12-31" }));

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 3 (BED-47 fix):
    The SAME code should be ALLOWED for a DIFFERENT stall.

    Before the fix, promo_code was globally UNIQUE, so this would have
    been rejected even though it's a different vendor's stall.

    Expected result:
    - HTTP status 201.
  */
  test("should allow a different stall to reuse the same promo code", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${secondStallId}`)
      .set("Authorization", `Bearer ${secondVendorToken}`)
      .send(validPromoPayload());

    expect(response.statusCode).toBe(201);
    expect(response.body.promo_code).toBe(uniqueCode);
    expect(response.body.stall_id).toBe(secondStallId);
  });

  /*
    Test case 4:
    A vendor should not be able to create a promotion on a stall they
    don't own.

    Expected result:
    - HTTP status 403.
  */
  test("should reject a vendor creating a promotion on another vendor's stall", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${secondStallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ promo_code: `OTHER${Date.now()}` }));

    expect(response.statusCode).toBe(403);
    expect(response.body).toHaveProperty("message");
  });

  /*
    Test case 5:
    Unauthenticated requests should be rejected.

    Expected result:
    - HTTP status 401.
  */
  test("should reject promotion creation without a token", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .send(validPromoPayload({ promo_code: `NOAUTH${Date.now()}` }));

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 6:
    A patron should not be able to create a vendor promotion.

    Expected result:
    - HTTP status 403.
  */
  test("should reject a patron from creating a promotion", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${patronToken}`)
      .send(validPromoPayload({ promo_code: `PATRON${Date.now()}` }));

    expect(response.statusCode).toBe(403);
  });

  /*
    Test case 7:
    Invalid payloads (e.g. missing discount_percent, end_date before
    start_date) should be rejected by validation.

    Expected result:
    - HTTP status 400, with a list of validation errors.
  */
  test("should reject a promotion payload missing required fields", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send({ promo_code: `BAD${Date.now()}` });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  /*
    Test case 8:
    A stall can now run multiple ACTIVE promotions with overlapping dates
    at the same time - only a duplicate promo_code is blocked, per BED-47's
    actual acceptance criteria (there's no requirement limiting a stall to
    one active promotion at a time).

    Expected result:
    - HTTP status 201.
  */
  test("should allow a second active promotion with overlapping dates on the same stall", async () => {
    const response = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ promo_code: `OVERLAP${Date.now()}` }));

    expect(response.statusCode).toBe(201);
  });

  /*
    Test case 9:
    A vendor should be able to update (toggle off) their own promotion
    without it being deleted - historical data must stay intact.

    Expected result:
    - HTTP status 200.
    - is_active is now false.
    - The promotion can still be fetched afterwards (not deleted).
  */
  test("should allow a vendor to toggle a promotion's is_active status", async () => {
    expect(createdPromotionId).toBeDefined();

    const response = await request(app)
      .put(`/api/vendor/promotions/${createdPromotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ is_active: false }));

    expect(response.statusCode).toBe(200);
    expect(response.body.is_active).toBe(false);

    const getResponse = await request(app)
      .get(`/api/vendor/promotions/${createdPromotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(getResponse.statusCode).toBe(200);
    expect(getResponse.body.promotion_id).toBe(createdPromotionId);
  });

  /*
    Test case 10:
    A vendor should be able to list all promotions for their own stall.

    Expected result:
    - HTTP status 200.
    - Response is an array containing the promotion created above.
  */
  test("should allow a vendor to list promotions for their own stall", async () => {
    const response = await request(app)
      .get(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((p) => p.promotion_id === createdPromotionId)).toBe(true);
  });

  /*
    Test case 11:
    A promotion that has never been used by any patron should be
    deletable outright.

    Expected result:
    - DELETE returns 204.
    - A subsequent GET for that promotion returns 404 (it's really gone).
  */
  test("should delete a promotion that has never been used", async () => {
    const createResponse = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ promo_code: `DELETEME${Date.now()}` }));

    expect(createResponse.statusCode).toBe(201);
    const promotionId = createResponse.body.promotion_id;

    const deleteResponse = await request(app)
      .delete(`/api/vendor/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(deleteResponse.statusCode).toBe(204);

    const getResponse = await request(app)
      .get(`/api/vendor/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(getResponse.statusCode).toBe(404);
  });

  /*
    Test case 12:
    A promotion that a patron has actually used (an order references it)
    must NOT be deletable - only deactivatable. This is what keeps
    BED-47's "never delete historical data" requirement intact.

    Expected result:
    - DELETE returns 409.
    - The promotion still exists afterwards (GET still succeeds).
  */
  test("should reject deleting a promotion that has already been used", async () => {
    const createResponse = await request(app)
      .post(`/api/vendor/promotions/stall/${stallId}`)
      .set("Authorization", `Bearer ${vendorToken}`)
      .send(validPromoPayload({ promo_code: `USEDPROMO${Date.now()}` }));

    const promotionId = createResponse.body.promotion_id;
    await markPromotionAsUsed(promotionId, stallId);

    const deleteResponse = await request(app)
      .delete(`/api/vendor/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(deleteResponse.statusCode).toBe(409);

    const getResponse = await request(app)
      .get(`/api/vendor/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(getResponse.statusCode).toBe(200);
  });

  /*
    Test case 13:
    A vendor should never be able to delete another vendor's promotion.

    Expected result:
    - HTTP status 403.
  */
  test("should reject deleting another vendor's promotion", async () => {
    const createResponse = await request(app)
      .post(`/api/vendor/promotions/stall/${secondStallId}`)
      .set("Authorization", `Bearer ${secondVendorToken}`)
      .send(validPromoPayload({ promo_code: `NOTYOURS${Date.now()}` }));

    const promotionId = createResponse.body.promotion_id;

    const deleteResponse = await request(app)
      .delete(`/api/vendor/promotions/${promotionId}`)
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(deleteResponse.statusCode).toBe(403);
  });

  /*
    Test case 14:
    Unauthenticated requests should be rejected, and deleting a
    non-existent promotion should 404.
  */
  test("should reject deletion without a token", async () => {
    const response = await request(app).delete(`/api/vendor/promotions/${createdPromotionId}`);
    expect(response.statusCode).toBe(401);
  });

  test("should return 404 deleting a non-existent promotion", async () => {
    const response = await request(app)
      .delete("/api/vendor/promotions/999999999")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(404);
  });
});