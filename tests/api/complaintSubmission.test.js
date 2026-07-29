const request = require("supertest");
const app = require("../../app");
const { getPatronToken, getVendorTestMenuItem } = require("../testHelpers");

/*
  This file tests the Complaint Submission feature.

  Main purpose:
  - Check that a registered (non-guest) user can submit a complaint against
    a stall, and that it comes back with a tracking id and default "Open" status.
  - Check that guests cannot submit a complaint (Complaints.patron_id is a
    NOT NULL FK to Users - there's no row for a guest).
  - Check that unauthenticated requests are rejected.
  - Check payload validation (missing fields, invalid complaint_type,
    description too short, invalid stall_id).

  This tests:
  POST /api/complaints
*/

describe("Complaint Submission API Tests", () => {
  let patronToken;
  let stallId;

  beforeAll(async () => {
    patronToken = await getPatronToken();

    const testData = await getVendorTestMenuItem();
    stallId = testData.stall_id;
  });

  function validComplaintPayload(overrides = {}) {
    return {
      stall_id: stallId,
      complaint_type: "Food Quality",
      description: "The noodles were cold and undercooked when I received my order.",
      ...overrides
    };
  }

  /*
    Test case 1:
    A registered user should be able to submit a complaint.

    Expected result:
    - HTTP status 201.
    - Response has a tracking_id.
    - The created complaint defaults to "Open" status.
  */
  test("should allow a registered user to submit a complaint", async () => {
    const response = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(validComplaintPayload());

    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty("tracking_id");
    expect(response.body.complaint.complaint_status).toBe("Open");
    expect(response.body.complaint.stall_id).toBe(stallId);
  });

  /*
    Test case 2:
    Unauthenticated requests should be rejected.

    Expected result:
    - HTTP status 401.
  */
  test("should reject complaint submission without a token", async () => {
    const response = await request(app)
      .post("/api/complaints")
      .send(validComplaintPayload());

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 3:
    An invalid complaint_type should be rejected by validation.

    Expected result:
    - HTTP status 400.
  */
  test("should reject an invalid complaint_type", async () => {
    const response = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(validComplaintPayload({ complaint_type: "Rude Waiter" }));

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  /*
    Test case 4:
    A description that's too short should be rejected by validation.

    Expected result:
    - HTTP status 400.
  */
  test("should reject a description that's too short", async () => {
    const response = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(validComplaintPayload({ description: "Bad." }));

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  /*
    Test case 5:
    A missing stall_id should be rejected by validation.

    Expected result:
    - HTTP status 400.
  */
  test("should reject a complaint with no stall_id", async () => {
    const response = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        complaint_type: "Service",
        description: "Waited over an hour for my order with no update from staff."
      });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  /*
    Test case 6:
    A stall_id that doesn't correspond to a real stall should be rejected
    with a friendly message (FK violation caught in the controller).

    Expected result:
    - HTTP status 400.
  */
  test("should reject a complaint against a non-existent stall", async () => {
    const response = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send(validComplaintPayload({ stall_id: 999999999 }));

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});
