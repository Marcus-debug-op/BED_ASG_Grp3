const feedbackController = require("../Controllers/feedbackController");
const feedbackModel = require("../Models/feedbackModel");

/*
  Unit tests for the Feedback controller (BED-2 create/read, BED-92
  update/delete).

  Main purpose:
  - Check that a patron can submit feedback for a stall.
  - Check that submitting feedback for a stall that doesn't exist is
    rejected (SQL foreign key violation).
  - Check that a vendor can view all feedback left on their stall.
  - Check that a patron can update or delete their own feedback.
  - Check that a patron CANNOT update or delete someone else's feedback
    (ownership check).
  - Check that unexpected database failures are caught and turned into a
    clean 500 response instead of crashing the server.

  This tests:
  feedbackController.submitFeedback
  feedbackController.getVendorFeedback
  feedbackController.updateFeedback
  feedbackController.deleteFeedback
*/

// Models/feedbackModel is mocked so these tests never touch SQL Server - they only verify the controller's own logic
jest.mock("../Models/feedbackModel"); 

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}
/*
  afterEach runs after every test in this file.
 
  Purpose:
  - Clear all mock call history and mocked return values between tests.
  - Without this, a mockResolvedValue/mockRejectedValue set in one test
    could leak into the next test and cause confusing failures.
*/
afterEach(() => {
  jest.clearAllMocks();
});

describe("feedbackController.submitFeedback (BED-2)", () => {
    /*
    Test case 1:
    Submitting feedback for a stall that exists should succeed.
 
    Expected result:
    - Model should be called with the patron's ID (from the token) and
      the feedback body.
    - HTTP status should be 201 Created.
    - Response body should be exactly the feedback record the model created.
  */
  test("returns 201 with the created feedback on success", async () => {
    const created = { feedback_id: 1, stall_id: 5, rating: 4, comment: "Good food!" };
    feedbackModel.createFeedback.mockResolvedValue(created);

    const req = { user: { sub: 42 }, body: { stall_id: 5, rating: 4, comment: "Good food!" } };
    const res = mockResponse();

    await feedbackController.submitFeedback(req, res);

    expect(feedbackModel.createFeedback).toHaveBeenCalledWith(42, req.body);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

    /*
    Test case 2:
    Submitting feedback for a stall_id that doesn't exist should be
    rejected.
 
    Why this matters:
    - SQL Server raises a foreign key violation (error.number 547) when
      stall_id doesn't match any row in the Stalls table.
    - The controller should recognise this specific error and translate
      it into a client-facing 400, not a generic 500.
 
    Expected result:
    - HTTP status should be 400 Bad Request.
  */
  test("returns 400 when the stall doesn't exist (SQL FK violation, error.number 547)", async () => {
    const fkError = new Error("FK violation");
    fkError.number = 547;
    feedbackModel.createFeedback.mockRejectedValue(fkError);

    const req = { user: { sub: 42 }, body: { stall_id: 9999, rating: 4, comment: "" } };
    const res = mockResponse();

    await feedbackController.submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  /*
    Test case 3:
    Submitting feedback should handle unexpected database failures
    gracefully.
 
    Expected result:
    - Model rejects with a generic (non-547) DB error.
    - Controller should fall back to a 500 response, not crash.
  */
  test("returns 500 on an unexpected database error", async () => {
    feedbackModel.createFeedback.mockRejectedValue(new Error("connection lost"));

    const req = { user: { sub: 42 }, body: { stall_id: 5, rating: 4, comment: "" } };
    const res = mockResponse();

    await feedbackController.submitFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("feedbackController.getVendorFeedback (BED-2)", () => {
    /*
    Test case 4:
    A vendor should be able to view all feedback left on their stall.
 
    Expected result:
    - Model should be called with the vendor's ID (from the token).
    - HTTP status should be 200 OK.
    - Response body should be exactly the feedback list from the model.
  */
  test("returns 200 with the vendor's feedback list", async () => {
    const feedbackList = [{ feedback_id: 1, stall_id: 5, rating: 5 }];
    feedbackModel.getFeedbackForVendor.mockResolvedValue(feedbackList);

    const req = { user: { sub: 7 } };
    const res = mockResponse();

    await feedbackController.getVendorFeedback(req, res);

    expect(feedbackModel.getFeedbackForVendor).toHaveBeenCalledWith(7);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(feedbackList);
  });

    /*
    Test case 5:
    Fetching vendor feedback should handle unexpected database failures
    gracefully.
 
    Expected result:
    - Model rejects with a generic DB error.
    - Controller should catch it and return 500, not crash.
  */
  test("returns 500 when encounter unexpected failure", async () => {
    feedbackModel.getFeedbackForVendor.mockRejectedValue(new Error("DB error"));

    const req = { user: { sub: 7 } };
    const res = mockResponse();

    await feedbackController.getVendorFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("feedbackController.updateFeedback (BED-92)", () => {
    /*
    Test case 6:
    A patron updating their own feedback should succeed.
 
    Expected result:
    - HTTP status should be 200 OK.
    - Response body should be exactly the updated feedback record.
  */
  test("returns 200 with the updated feedback when the caller owns it", async () => {
    feedbackModel.getFeedbackById.mockResolvedValue({ feedback_id: 1, patron_id: 42 });
    const updated = { feedback_id: 1, rating: 3, comment: "Changed my mind" };
    feedbackModel.updateFeedback.mockResolvedValue(updated);

    const req = {
      user: { sub: 42 },
      params: { feedbackId: "1" },
      body: { stall_id: 5, rating: 3, comment: "Changed my mind" }
    };
    const res = mockResponse();

    await feedbackController.updateFeedback(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

    /*
    Test case 7:
    Updating feedback that doesn't exist should 404, and should never
    attempt the actual update.
 
    Expected result:
    - feedbackModel.updateFeedback should NOT be called.
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when the feedback doesn't exist", async () => {
    feedbackModel.getFeedbackById.mockResolvedValue(null);

    const req = { user: { sub: 42 }, params: { feedbackId: "999" }, body: {} };
    const res = mockResponse();

    await feedbackController.updateFeedback(req, res);

    expect(feedbackModel.updateFeedback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

    /*
    Test case 8:
    A patron should NOT be able to update someone else's feedback.
 
    Why this matters:
    - This is an authorization/ownership check, not just a validation
      check - the feedback exists, but it doesn't belong to the caller.
 
    Expected result:
    - feedbackModel.updateFeedback should NOT be called (no write happens).
    - HTTP status should be 403 Forbidden.
  */
  test("returns 403 and makes no write when the caller does not own the feedback", async () => {
    feedbackModel.getFeedbackById.mockResolvedValue({ feedback_id: 1, patron_id: 999 });

    const req = { user: { sub: 42 }, params: { feedbackId: "1" }, body: { rating: 1 } };
    const res = mockResponse();

    await feedbackController.updateFeedback(req, res);

    expect(feedbackModel.updateFeedback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe("feedbackController.deleteFeedback (BED-92)", () => {
    /*
    Test case 9:
    A patron deleting their own feedback should succeed.
 
    Expected result:
    - Model should be called with the feedback ID and the caller's user ID.
    - HTTP status should be 200 OK.
  */
  test("returns 200 when the caller owns the feedback", async () => {
    feedbackModel.getFeedbackById.mockResolvedValue({ feedback_id: 1, patron_id: 42 });
    feedbackModel.deleteFeedback.mockResolvedValue(true);

    const req = { user: { sub: 42 }, params: { feedbackId: "1" } };
    const res = mockResponse();

    await feedbackController.deleteFeedback(req, res);

    expect(feedbackModel.deleteFeedback).toHaveBeenCalledWith(1, 42);
    expect(res.status).toHaveBeenCalledWith(200);
  });

    /*
    Test case 10:
    Deleting feedback that doesn't exist should return 404 and never
    attempt the actual delete.
 
    Expected result:
    - feedbackModel.deleteFeedback should NOT be called.
    - HTTP status should be 404 Not Found.
  */
  test("returns 404 when the feedback doesn't exist", async () => {
    feedbackModel.getFeedbackById.mockResolvedValue(null);

    const req = { user: { sub: 42 }, params: { feedbackId: "999" } };
    const res = mockResponse();

    await feedbackController.deleteFeedback(req, res);

    expect(feedbackModel.deleteFeedback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 403 and makes no delete when the caller does not own the feedback", async () => {
    feedbackModel.getFeedbackById.mockResolvedValue({ feedback_id: 1, patron_id: 999 });

    const req = { user: { sub: 42 }, params: { feedbackId: "1" } };
    const res = mockResponse();

    await feedbackController.deleteFeedback(req, res);

    expect(feedbackModel.deleteFeedback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
