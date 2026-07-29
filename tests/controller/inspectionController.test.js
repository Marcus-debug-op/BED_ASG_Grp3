// Import the controller we want to test.
// The controller contains the request/response logic for NEA inspections.
const inspectionController = require("../../Controllers/inspectionController");

// Import the model because the controller calls model functions.
// In this test, we will mock the model so the test does not touch the real database.
const inspectionModel = require("../../Models/inspectionModel");

// Tell Jest to replace the real inspectionModel with a fake/mock version.
// This lets us control what the model returns during the test.
jest.mock("../Models/inspectionModel");

// Helper function to create a fake Express response object.
// Express normally gives us res.status() and res.json(),
// but in unit tests, we need to mock them ourselves.
function mockResponse() {
  const res = {};

  // mockReturnValue(res) allows chaining like:
  // res.status(200).json(...)
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
}

describe("Inspection Controller", () => {
  // Clear all mock call history before each test.
  // This prevents one test from affecting another test.
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("scheduleInspection should return 404 when stall does not exist", async () => {
    // Fake request object.
    // req.user.sub represents the logged-in officer ID from the JWT token.
    const req = {
      user: { sub: 5 },
      body: {
        stall_id: 1,
        inspection_date: "2026-07-30T10:00:00"
      }
    };

    const res = mockResponse();

    // Simulate the model saying the stall does not exist.
    inspectionModel.stallExists.mockResolvedValue(false);

    // Call the controller function.
    await inspectionController.scheduleInspection(req, res);

    // Check that the controller checked whether the stall exists.
    expect(inspectionModel.stallExists).toHaveBeenCalledWith(1);

    // Since the stall does not exist, controller should return 404.
    expect(res.status).toHaveBeenCalledWith(404);

    // Check that the response contains a message.
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String)
      })
    );
  });

  test("scheduleInspection should create inspection when stall exists", async () => {
    const req = {
      user: { sub: 5 },
      body: {
        stall_id: 1,
        inspection_date: "2026-07-30T10:00:00"
      }
    };

    const res = mockResponse();

    // Fake inspection returned by the model after successful insert.
    const mockInspection = {
      inspection_id: 10,
      stall_id: 1,
      officer_id: 5,
      inspection_status: "Scheduled"
    };

    // Simulate stall exists.
    inspectionModel.stallExists.mockResolvedValue(true);

    // Simulate successful inspection creation.
    inspectionModel.scheduleInspection.mockResolvedValue(mockInspection);

    await inspectionController.scheduleInspection(req, res);

    // Check that controller passes stall_id, officer_id, and inspection_date to the model.
    // officer_id should come from req.user.sub, not request body.
    expect(inspectionModel.scheduleInspection).toHaveBeenCalledWith(
      1,
      5,
      "2026-07-30T10:00:00"
    );

    // Successful creation should return HTTP 201.
    expect(res.status).toHaveBeenCalledWith(201);

    // Response should return the created inspection.
    expect(res.json).toHaveBeenCalledWith(mockInspection);
  });

  test("cancelInspection should cancel scheduled inspection", async () => {
    const req = {
      user: { sub: 5 },
      params: { inspectionId: 10 }
    };

    const res = mockResponse();

    // Simulate model successfully cancelling the inspection.
    inspectionModel.cancelInspection.mockResolvedValue({
      inspection_id: 10,
      inspection_status: "Cancelled"
    });

    await inspectionController.cancelInspection(req, res);

    // The controller should pass inspectionId and logged-in officer ID to the model.
    // This makes sure officers can only cancel their own inspections.
    expect(inspectionModel.cancelInspection).toHaveBeenCalledWith("10", 5);

    // Successful cancel should return HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("completeInspectionResult should save result and hygiene grade", async () => {
    const req = {
      user: { sub: 5 },
      params: { inspectionId: 10 },
      body: {
        score: 88,
        hygiene_grade: "A",
        result: "Pass",
        remarks: "Good hygiene standard."
      }
    };

    const res = mockResponse();

    // Simulate model successfully completing the inspection.
    inspectionModel.completeInspectionResult.mockResolvedValue({
      inspection_id: 10,
      score: 88,
      hygiene_grade: "A",
      result: "Pass",
      inspection_status: "Completed"
    });

    await inspectionController.completeInspectionResult(req, res);

    // Controller should send all inspection result fields to the model.
    // The model will update Inspections and also update Stalls.current_hygiene_grade.
    expect(inspectionModel.completeInspectionResult).toHaveBeenCalledWith(
      "10",
      5,
      88,
      "A",
      "Good hygiene standard.",
      "Pass"
    );

    // Successful completion should return HTTP 200.
    expect(res.status).toHaveBeenCalledWith(200);
  });
});