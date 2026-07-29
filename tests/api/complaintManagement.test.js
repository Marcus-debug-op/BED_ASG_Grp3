const request = require("supertest");
const app = require("../../app");
const {
  getPatronToken,
  getVendorTestMenuItem,
  getOfficerToken,
  getOperatorToken
} = require("../testHelpers");

/*
  This file tests the Complaint Management (review & resolution) feature.

  Main purpose:
  - Check that "Hygiene" complaints are only listable/actionable by an
    officer, and every other complaint type only by an operator (routing
    rule from Models/complaintModel.js: requiredRoleForType).
  - Check that GET /api/complaints supports filtering by status.
  - Check that PATCH /api/complaints/:complaintId updates the status and
    appends a resolution note, without needing the note.
  - Check that a vendor/patron (not officer/operator) can't access these routes.
  - Check 401/404 handling.

  This tests:
  GET   /api/complaints
  GET   /api/complaints/:complaintId
  PATCH /api/complaints/:complaintId

  Important:
  - Officer/operator accounts aren't seeded by seed.sql, so
    getOfficerToken()/getOperatorToken() create them (once) directly in
    the database the first time a test run needs them.
  - Complaints are created via POST /api/complaints (as a patron) in
    beforeAll, since that's the only way a complaint gets a real
    patron_id/stall_id that satisfies the table's foreign keys.
*/

describe("Complaint Management (Officer/Operator) API Tests", () => {
  let patronToken;
  let officerToken;
  let operatorToken;
  let stallId;
  let hygieneComplaintId;
  let serviceComplaintId;

  beforeAll(async () => {
    patronToken = await getPatronToken();
    officerToken = await getOfficerToken();
    operatorToken = await getOperatorToken();

    const testData = await getVendorTestMenuItem();
    stallId = testData.stall_id;

    const hygieneResponse = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: stallId,
        complaint_type: "Hygiene",
        description: "Found a hair in my food and the stall counter looked visibly dirty."
      });
    hygieneComplaintId = hygieneResponse.body.complaint.complaint_id;

    const serviceResponse = await request(app)
      .post("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`)
      .send({
        stall_id: stallId,
        complaint_type: "Service",
        description: "Staff were rude and refused to correct an obviously wrong order."
      });
    serviceComplaintId = serviceResponse.body.complaint.complaint_id;
  });

  /*
    Test case 1:
    An officer should be able to list complaints, and should only ever see
    "Hygiene" complaints (their queue is scoped by type).

    Expected result:
    - HTTP status 200.
    - Every complaint in the response is complaint_type "Hygiene".
  */
  test("should let an officer list only Hygiene complaints", async () => {
    const response = await request(app)
      .get("/api/complaints")
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.every((c) => c.complaint_type === "Hygiene")).toBe(true);
    expect(response.body.some((c) => c.complaint_id === hygieneComplaintId)).toBe(true);
  });

  /*
    Test case 2:
    An operator should be able to list complaints, and should only ever see
    non-"Hygiene" complaints.

    Expected result:
    - HTTP status 200.
    - No complaint in the response is complaint_type "Hygiene".
  */
  test("should let an operator list only non-Hygiene complaints", async () => {
    const response = await request(app)
      .get("/api/complaints")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.every((c) => c.complaint_type !== "Hygiene")).toBe(true);
    expect(response.body.some((c) => c.complaint_id === serviceComplaintId)).toBe(true);
  });

  /*
    Test case 3:
    GET /api/complaints should support filtering by status.

    Expected result:
    - HTTP status 200.
    - Every complaint in the response has status "Open" (the default for a
      freshly submitted complaint).
  */
  test("should filter complaints by status", async () => {
    const response = await request(app)
      .get("/api/complaints?status=Open")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.every((c) => c.complaint_status === "Open")).toBe(true);
  });

  /*
    Test case 4:
    An operator should be rejected from acting on a Hygiene complaint - that
    belongs to an officer, even though /api/complaints in general allows
    the operator role.

    Expected result:
    - HTTP status 403.
  */
  test("should reject an operator from viewing a Hygiene complaint", async () => {
    const response = await request(app)
      .get(`/api/complaints/${hygieneComplaintId}`)
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.statusCode).toBe(403);
  });

  /*
    Test case 5:
    An officer should be rejected from acting on a non-Hygiene complaint.

    Expected result:
    - HTTP status 403.
  */
  test("should reject an officer from viewing a Service complaint", async () => {
    const response = await request(app)
      .get(`/api/complaints/${serviceComplaintId}`)
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(403);
  });

  /*
    Test case 6:
    A vendor (not officer/operator) should not be able to access complaint
    management at all.

    Expected result:
    - HTTP status 403.
  */
  test("should reject a patron from accessing complaint management", async () => {
    const response = await request(app)
      .get("/api/complaints")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
  });

  /*
    Test case 7:
    Unauthenticated requests should be rejected.

    Expected result:
    - HTTP status 401.
  */
  test("should reject complaint management without a token", async () => {
    const response = await request(app).get("/api/complaints");

    expect(response.statusCode).toBe(401);
  });

  /*
    Test case 8:
    An officer should be able to update a Hygiene complaint's status and
    attach a resolution note.

    Expected result:
    - HTTP status 200.
    - complaint_status is updated.
    - The note appears in the complaint's notes list.
  */
  test("should let an officer update a Hygiene complaint's status with a note", async () => {
    const response = await request(app)
      .patch(`/api/complaints/${hygieneComplaintId}`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ status: "In Progress", note: "Scheduled an inspection for this stall." });

    expect(response.statusCode).toBe(200);
    expect(response.body.complaint_status).toBe("In Progress");
    expect(response.body.notes.some((n) => n.note === "Scheduled an inspection for this stall.")).toBe(true);
  });

  /*
    Test case 9:
    An invalid status value should be rejected by validation.

    Expected result:
    - HTTP status 400.
  */
  test("should reject an invalid status value", async () => {
    const response = await request(app)
      .patch(`/api/complaints/${hygieneComplaintId}`)
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ status: "Ignored" });

    expect(response.statusCode).toBe(400);
    expect(response.body).toHaveProperty("errors");
  });

  /*
    Test case 10:
    Updating a complaint that doesn't exist should 404.

    Expected result:
    - HTTP status 404.
  */
  test("should return 404 for a non-existent complaint", async () => {
    const response = await request(app)
      .patch("/api/complaints/999999999")
      .set("Authorization", `Bearer ${officerToken}`)
      .send({ status: "Resolved" });

    expect(response.statusCode).toBe(404);
  });
});
