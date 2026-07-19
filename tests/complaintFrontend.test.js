/**
 * @jest-environment jsdom
 */

const { flushPromises, jsonResponse } = require("./frontendTestHelpers");

/*
  This file tests the patron-facing Complaint Submission frontend
  (public/patron/Complaint.js), rewritten to call the real
  POST /api/complaints backend instead of the old Firestore version.

  Main purpose:
  - Check the stall name loads from GET /api/stalls/:id/menu.
  - Check submitting requires sign-in (a token) and a non-empty complaint.
  - Check a successful submission POSTs the right payload (stall_id,
    complaint_type, description) and shows the tracking id.
  - Check a backend validation error is surfaced to the patron and the
    submit button is re-enabled so they can retry.

  Important:
  - Complaint.js is a plain script (not an ES module) that reads the DOM
    and attaches its click handler the moment it's require()'d, so each
    test rebuilds the DOM fixture, sets the URL and mocks, THEN
    jest.resetModules() + require()s the script fresh.
  - global.fetch and window.alert/window.history.back aren't implemented
    by jsdom, so they're mocked directly.
*/

function renderComplaintPageFixture() {
  document.body.innerHTML = `
    <p id="stall-name-display">Loading stall info...</p>
    <select id="complaint-type">
      <option value="Hygiene">Hygiene</option>
      <option value="Service">Service</option>
      <option value="Food Quality">Food Quality</option>
      <option value="Overcharging">Overcharging</option>
      <option value="Other">Other</option>
    </select>
    <textarea id="complaint-text"></textarea>
    <textarea id="improvement-text"></textarea>
    <button id="submit-btn">Submit</button>
  `;
}

function loadComplaintScript(stallIdQuery = "?id=1") {
  window.history.pushState({}, "", `/patron/complaint.html${stallIdQuery}`);
  renderComplaintPageFixture();

  jest.resetModules();
  if (!jest.isMockFunction(global.fetch)) {
    global.fetch = jest.fn();
  }
  window.alert = jest.fn();
  window.history.back = jest.fn();

  require("../public/patron/Complaint.js");
}

describe("Patron Complaint Submission Frontend Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  /*
    Test case 1:
    With no ?id= in the URL, the page has nothing to complain about, so it
    should show an error and disable submission rather than let the patron
    submit a complaint against no stall at all.

    Expected result:
    - stall-name-display shows an error.
    - submit-btn is disabled.
  */
  test("should disable submission when no stall id is in the URL", async () => {
    loadComplaintScript("");
    await flushPromises();

    expect(document.getElementById("stall-name-display").innerText).toBe("Error: No Stall Selected");
    expect(document.getElementById("submit-btn").disabled).toBe(true);
  });

  /*
    Test case 2:
    The stall name should load from the real backend endpoint
    (GET /api/stalls/:id/menu), not Firestore.

    Expected result:
    - fetch is called with "/api/stalls/1/menu".
    - stall-name-display shows the stall's name from the response.
  */
  test("should load the stall name from the backend", async () => {
    fetchWillLoadStall("Laksa Legend");
    loadComplaintScript("?id=1");
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith("/api/stalls/1/menu");
    expect(document.getElementById("stall-name-display").innerText).toBe("For: Laksa Legend");
  });

  function fetchWillLoadStall(stallName) {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(200, { stall: { stall_name: stallName }, menu_items: [] })
    );
  }

  /*
    Test case 3:
    A patron with no token (not signed in) should be blocked from
    submitting, with a clear message telling them to sign in.

    Expected result:
    - alert is called about signing in.
    - No POST request is made.
  */
  test("should require sign-in before submitting", async () => {
    loadComplaintScript("?id=1");
    await flushPromises();
    global.fetch.mockClear();

    document.getElementById("complaint-text").value = "The soup was cold when it arrived at my table.";
    document.getElementById("submit-btn").click();
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith(expect.stringMatching(/sign in/i));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /*
    Test case 4:
    Submitting with an empty complaint should be blocked client-side.

    Expected result:
    - alert is called asking for a complaint.
    - No POST request is made.
  */
  test("should require complaint text before submitting", async () => {
    localStorage.setItem("token", "fake-jwt-token");
    loadComplaintScript("?id=1");
    await flushPromises();
    global.fetch.mockClear();

    document.getElementById("submit-btn").click();
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith("Please enter a complaint.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  /*
    Test case 5:
    A valid, signed-in submission should POST the right shape to
    /api/complaints and show the returned tracking id.

    Expected result:
    - POST body has stall_id (number), complaint_type, and description.
    - alert shows the tracking id from the response.
    - The patron is sent back (window.history.back).
  */
  test("should submit a complaint and show the tracking id on success", async () => {
    localStorage.setItem("token", "fake-jwt-token");
    loadComplaintScript("?id=1");
    await flushPromises();

    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(201, {
        tracking_id: "CMP-12345",
        complaint: { complaint_id: 1, complaint_status: "Open" }
      })
    );

    document.getElementById("complaint-type").value = "Food Quality";
    document.getElementById("complaint-text").value = "The soup was cold when it arrived at my table.";
    document.getElementById("improvement-text").value = "Please reheat before serving.";

    document.getElementById("submit-btn").click();
    await flushPromises();

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/complaints",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-jwt-token",
          "Content-Type": "application/json"
        })
      })
    );

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.stall_id).toBe(1);
    expect(body.complaint_type).toBe("Food Quality");
    expect(body.description).toContain("The soup was cold");
    expect(body.description).toContain("Please reheat before serving.");

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("CMP-12345"));
    expect(window.history.back).toHaveBeenCalled();
  });

  /*
    Test case 6:
    A validation error from the backend (e.g. description too short)
    should be shown to the patron, and the submit button re-enabled so
    they can fix it and try again.

    Expected result:
    - alert shows the backend's message.
    - submit-btn text resets to "Submit" and is re-enabled.
  */
  test("should surface a backend validation error and re-enable the button", async () => {
    localStorage.setItem("token", "fake-jwt-token");
    loadComplaintScript("?id=1");
    await flushPromises();

    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse(400, {
        message: "Validation failed.",
        errors: ['"description" length must be at least 10 characters long']
      })
    );

    document.getElementById("complaint-text").value = "This complaint text is long enough to pass client validation.";
    document.getElementById("submit-btn").click();
    await flushPromises();

    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Validation failed."));

    const submitBtn = document.getElementById("submit-btn");
    expect(submitBtn.innerText).toBe("Submit");
    expect(submitBtn.disabled).toBe(false);
  });
});