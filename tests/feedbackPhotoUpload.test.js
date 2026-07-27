const feedbackController = require("../Controllers/feedbackController");
const feedbackModel = require("../Models/feedbackModel");

/*
  Unit tests for BED-132 (feedback photo upload). Only covers the new
  photo-handling behavior added to submitFeedback - the base submission
  logic (validation, ownership on edit/delete, etc.) is already covered
  by feedbackController.test.js from Sprint 2 (BED-2/BED-92).
*/

jest.mock("../Models/feedbackModel");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("feedbackController.submitFeedback photo handling (BED-132)", () => {
  test("passes the uploaded photo's path to the model when a file is present", async () => {
    feedbackModel.createFeedback.mockResolvedValue({
      feedback_id: 1,
      stall_id: 5,
      photo_path: "uploads/feedback/123-photo.jpg"
    });

    const req = {
      user: { sub: 42 },
      body: { stall_id: 5, rating: 4, comment: "Great food!" },
      file: { filename: "123-photo.jpg" }
    };
    const res = mockResponse();

    await feedbackController.submitFeedback(req, res);

    expect(feedbackModel.createFeedback).toHaveBeenCalledWith(42, {
      stall_id: 5,
      rating: 4,
      comment: "Great food!",
      photo_path: "uploads/feedback/123-photo.jpg"
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("passes null for photo_path when no file is uploaded (text-only review)", async () => {
    feedbackModel.createFeedback.mockResolvedValue({ feedback_id: 2, stall_id: 5, photo_path: null });

    const req = {
      user: { sub: 42 },
      body: { stall_id: 5, rating: 3, comment: "Decent." },
      file: undefined
    };
    const res = mockResponse();

    await feedbackController.submitFeedback(req, res);

    expect(feedbackModel.createFeedback).toHaveBeenCalledWith(42, {
      stall_id: 5,
      rating: 3,
      comment: "Decent.",
      photo_path: null
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
