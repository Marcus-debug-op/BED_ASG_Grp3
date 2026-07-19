/**
 * @jest-environment jsdom
 */

const { flushPromises, jsonResponse } = require("./frontendTestHelpers");

/*
  This file tests the vendor-facing Promotion Management frontend
  (public/vendor/VendorPromotions.js).

  Main purpose:
  - Check a non-vendor (no token, or wrong role) is blocked from the form.
  - Check stalls + promotions load on init and render into the list.
  - Check creating a new promotion POSTs to the create route with the
    right payload.
  - Check the "toggle active" button calls the real PUT /:promotionId
    route with the FULL payload and is_active flipped - NOT the old
    PATCH .../active route, which doesn't exist on the backend.
  - Check there is no "Delete" action rendered or wired up anywhere -
    BED-47 promotions are deactivated, never deleted, and there's no
    DELETE route on the backend to call.

  Important:
  - VendorPromotions.js only runs its logic inside a DOMContentLoaded
    listener. jsdom's document is already "complete" by the time Jest
    requires the script, so DOMContentLoaded won't fire on its own -
    each test manually dispatches it after requiring the script.
  - global.fetch isn't implemented by jsdom, so it's mocked directly.
*/

function renderPromoPageFixture() {
  document.body.innerHTML = `
    <select id="stallSelect" hidden></select>
    <section>
      <form id="promoForm">
        <input type="hidden" id="promoId">
        <input id="code" />
        <input id="description" />
        <input id="value" type="number" />
        <input id="active" type="checkbox" checked />
        <input id="startDate" type="date" />
        <input id="endDate" type="date" />
        <input id="minSpend" type="number" />
        <input id="maxRedemptions" type="number" />
        <button class="promo-save-btn" type="submit">Save Promotion</button>
        <button type="button" id="cancelEditBtn" hidden>Cancel Edit</button>
        <p id="promoMsg"></p>
      </form>
    </section>
    <div id="promoList"></div>
  `;
}

function loadVendorPromotionsScript() {
  renderPromoPageFixture();
  jest.resetModules();
  global.fetch = jest.fn();
  require("../public/vendor/VendorPromotions.js");
}

async function initAsSignedInVendor({ stalls, promotions }) {
  localStorage.setItem("token", "fake-jwt-token");
  localStorage.setItem("role", "vendor");

  loadVendorPromotionsScript();

  global.fetch
    .mockResolvedValueOnce(jsonResponse(200, stalls)) // GET /api/vendor/my-stalls
    .mockResolvedValueOnce(jsonResponse(200, promotions)); // GET /api/vendor/promotions/stall/:id

  document.dispatchEvent(new Event("DOMContentLoaded"));
  await flushPromises();
}

const samplePromotion = {
  promotion_id: 10,
  promo_code: "SAVE10",
  description: "10% off",
  discount_percent: 10,
  is_active: true,
  start_date: "2026-01-01T00:00:00.000Z",
  end_date: "2026-12-31T00:00:00.000Z",
  min_spend_amount: 10.5,
  max_redemptions: 50
};

describe("Vendor Promotion Management Frontend Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  /*
    Test case 1:
    A visitor with no vendor token should be blocked from the form,
    with the submit button disabled, rather than being allowed to
    attempt a request that would just 401/403.

    Expected result:
    - promoMsg shows a sign-in message.
    - The submit button is disabled.
    - No fetch call is made.
  */
  test("should block the form when not signed in as a vendor", async () => {
    loadVendorPromotionsScript();

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await flushPromises();

    expect(document.getElementById("promoMsg").textContent).toMatch(/sign in as a vendor/i);
    expect(document.querySelector("button[type='submit']").disabled).toBe(true);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /*
    Test case 2:
    On load, a signed-in vendor's stalls and that stall's promotions
    should be fetched and rendered.

    Expected result:
    - fetch is called for /api/vendor/my-stalls then
      /api/vendor/promotions/stall/1.
    - The promo list shows the promo code and "Active" status.
  */
  test("should load and render the vendor's promotions on init", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: [samplePromotion]
    });

    expect(global.fetch).toHaveBeenNthCalledWith(1, "/api/vendor/my-stalls", expect.anything());
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/api/vendor/promotions/stall/1", expect.anything());

    const promoList = document.getElementById("promoList");
    expect(promoList.innerHTML).toContain("SAVE10");
    expect(promoList.innerHTML).toContain("Active");
    expect(promoList.innerHTML).toContain("Min spend $10.50");
    expect(promoList.innerHTML).toContain("Limit 50 uses");
  });

  /*
    Test case 3:
    Every promotion card should render a Delete action (the backend now
    supports it, conditionally - see the delete-flow tests below).

    Expected result:
    - An element with data-action="delete" exists in the list.
  */
  test("should render a delete action for every promotion", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: [samplePromotion]
    });

    expect(document.querySelector('[data-action="delete"]')).not.toBeNull();
  });

  /*
    Test case 3b:
    Clicking Delete should confirm first, then send DELETE to the real
    route. A successful delete is 204 No Content, so the handler must not
    try to parse a JSON body from it.

    Expected result:
    - window.confirm is called before anything else.
    - fetch is called with method DELETE to /api/vendor/promotions/10.
    - The list reloads afterwards without throwing on the empty response body.
  */
  test("should delete a promotion after confirming", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: [samplePromotion]
    });

    window.confirm = jest.fn().mockReturnValue(true);

    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 204 }) // DELETE - no body
      .mockResolvedValueOnce(jsonResponse(200, [])); // reload list afterwards

    document.querySelector('[data-action="delete"]').click();
    await flushPromises();

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "/api/vendor/promotions/10",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(document.getElementById("promoMsg").textContent).toMatch(/deleted/i);
  });

  /*
    Test case 3c:
    Cancelling the confirm dialog should NOT send any DELETE request.
  */
  test("should not delete when the confirmation is cancelled", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: [samplePromotion]
    });

    window.confirm = jest.fn().mockReturnValue(false);
    global.fetch.mockClear();

    document.querySelector('[data-action="delete"]').click();
    await flushPromises();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  /*
    Test case 3d:
    A promotion that's already been used should come back as a 409 from
    the backend, and that message should be shown to the vendor rather
    than silently failing.
  */
  test("should surface a 409 error when trying to delete a used promotion", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: [samplePromotion]
    });

    window.confirm = jest.fn().mockReturnValue(true);
    global.fetch.mockResolvedValueOnce(
      jsonResponse(409, { message: "This promo code has already been used by a patron, so it can't be deleted. Deactivate it instead." })
    );

    document.querySelector('[data-action="delete"]').click();
    await flushPromises();

    expect(document.getElementById("promoMsg").textContent).toMatch(/already been used/i);
  });

  /*
    Test case 4:
    Submitting the form with an empty promoId (create mode) should POST
    to the create route with the entered fields.

    Expected result:
    - fetch is called with method POST to /api/vendor/promotions/stall/1.
    - The body matches the entered promo_code/discount_percent/dates.
  */
  test("should create a new promotion on submit", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: []
    });

    document.getElementById("code").value = "WELCOME5";
    document.getElementById("description").value = "Launch discount";
    document.getElementById("value").value = "5";
    document.getElementById("startDate").value = "2026-01-01";
    document.getElementById("endDate").value = "2026-01-31";

    global.fetch
      .mockResolvedValueOnce(jsonResponse(201, { promotion_id: 20, promo_code: "WELCOME5" })) // POST create
      .mockResolvedValueOnce(jsonResponse(200, [])); // reload list afterwards

    document.getElementById("promoForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "/api/vendor/promotions/stall/1",
      expect.objectContaining({ method: "POST" })
    );

    const [, options] = global.fetch.mock.calls[2];
    const body = JSON.parse(options.body);

    expect(body.promo_code).toBe("WELCOME5");
    expect(body.discount_percent).toBe(5);
    expect(body.start_date).toBe("2026-01-01");
    expect(body.end_date).toBe("2026-01-31");
  });

  /*
    Test case 5 (the actual bug fix):
    Clicking "Set Inactive" on an active promotion must call the REAL
    update route (PUT /api/vendor/promotions/:id) with the full payload
    and is_active flipped to false - not PATCH .../active, which 404s.

    Expected result:
    - fetch is called with method PUT to /api/vendor/promotions/10
      (no "/active" suffix).
    - The body's is_active is false, and the rest of the promotion's
      fields are carried over unchanged (the update route requires the
      full payload, not a partial patch).
  */
  test("should toggle a promotion's active status via PUT, not PATCH .../active", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: [samplePromotion]
    });

    global.fetch
      .mockResolvedValueOnce(jsonResponse(200, { ...samplePromotion, is_active: false })) // PUT toggle
      .mockResolvedValueOnce(jsonResponse(200, [])); // reload list afterwards

    const toggleBtn = document.querySelector('[data-action="toggle"]');
    toggleBtn.click();
    await flushPromises();

    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      "/api/vendor/promotions/10",
      expect.objectContaining({ method: "PUT" })
    );

    const [, options] = global.fetch.mock.calls[2];
    const body = JSON.parse(options.body);

    expect(body.is_active).toBe(false);
    expect(body.promo_code).toBe("SAVE10");
    expect(body.discount_percent).toBe(10);
    // The bug this guards against: PUT is a full replace, not a patch, so a
    // naive toggle implementation could silently wipe these back to null.
    expect(body.min_spend_amount).toBe(10.5);
    expect(body.max_redemptions).toBe(50);
  });

  /*
    Test case 6:
    Creating a promotion with a minimum spend and usage limit entered
    should send them as numbers; leaving them blank should send null
    rather than 0/NaN/empty-string.

    Expected result:
    - POST body has min_spend_amount and max_redemptions as numbers when
      filled in.
  */
  test("should send minimum spend and usage limit when entered", async () => {
    await initAsSignedInVendor({
      stalls: [{ stall_id: 1, stall_name: "Lao Ban Soya Beancurd" }],
      promotions: []
    });

    document.getElementById("code").value = "BIGORDER20";
    document.getElementById("value").value = "20";
    document.getElementById("startDate").value = "2026-01-01";
    document.getElementById("endDate").value = "2026-01-31";
    document.getElementById("minSpend").value = "25.5";
    document.getElementById("maxRedemptions").value = "100";

    global.fetch
      .mockResolvedValueOnce(jsonResponse(201, { promotion_id: 30, promo_code: "BIGORDER20" }))
      .mockResolvedValueOnce(jsonResponse(200, []));

    document.getElementById("promoForm").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();

    const [, options] = global.fetch.mock.calls[2];
    const body = JSON.parse(options.body);

    expect(body.min_spend_amount).toBe(25.5);
    expect(body.max_redemptions).toBe(100);
  });
});