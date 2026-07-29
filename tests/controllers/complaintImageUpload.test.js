const complaintController = require("../../Controllers/complaintController");
const complaintModel = require("../../Models/complaintModel");

/*
  Unit tests for BED-131 (complaint image upload). Only covers the new
  image-handling behavior added to submitComplaint - the base submission
  logic (validation, FK errors, etc.) is already covered by teammates'
  supertest-based tests in complaintSubmission.test.js.
*/

jest.mock("../Models/complaintModel");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("complaintController.submitComplaint image handling (BED-131)", () => {
  test("passes the uploaded image's path to the model when a file is present", async () => {
    complaintModel.createComplaint.mockResolvedValue({
      complaint_id: 1,
      stall_id: 5,
      image_path: "uploads/complaints/123-photo.jpg"
    });

    const req = {
      user: { sub: 42 },
      body: { stall_id: 5, complaint_type: "Hygiene", description: "Unclean table area." },
      file: { filename: "123-photo.jpg" }
    };
    const res = mockResponse();

    await complaintController.submitComplaint(req, res);

    expect(complaintModel.createComplaint).toHaveBeenCalledWith(
      42, 5, "Hygiene", "Unclean table area.", "uploads/complaints/123-photo.jpg"
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test("passes null for the image path when no file is uploaded (text-only complaint)", async () => {
    complaintModel.createComplaint.mockResolvedValue({ complaint_id: 2, stall_id: 5, image_path: null });

    const req = {
      user: { sub: 42 },
      body: { stall_id: 5, complaint_type: "Service", description: "Long wait time at the stall." },
      file: undefined
    };
    const res = mockResponse();

    await complaintController.submitComplaint(req, res);

    expect(complaintModel.createComplaint).toHaveBeenCalledWith(
      42, 5, "Service", "Long wait time at the stall.", null
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
