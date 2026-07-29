// Controller unit test for NEA inspection features.
// The model is mocked so this test focuses only on controller behaviour.

const inspectionController = require("../../Controllers/inspectionController");
const inspectionModel = require("../../Models/inspectionModel");

jest.mock("../../Models/inspectionModel");

function mockResponse() {
  const res = {};

  // Allows Express-style chaining: res.status(200).json(...)
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);

  return res;
}

describe("Inspection Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("scheduleInspection should return 404 when stall does not exist", async () => {
    const req = {
      user: { sub: 5 },
      body: {
        stall_id: 1,
        inspection_date: "2026-07-30T10:00:00"
      }
    };

    const res = mockResponse();

    // Simulate model saying the stall does not exist.
    inspectionModel.stallExists.mockResolvedValue(false);

    await inspectionController.scheduleInspection(req, res);

    expect(inspectionModel.stallExists).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: "Stall not found."
    });
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

    const mockInspection = {
      inspection_id: 10,
      stall_id: 1,
      officer_id: 5,
      inspection_status: "Scheduled"
    };

    inspectionModel.stallExists.mockResolvedValue(true);
    inspectionModel.scheduleInspection.mockResolvedValue(mockInspection);

    await inspectionController.scheduleInspection(req, res);

    // Controller should use officer ID from JWT token, not from request body.
    expect(inspectionModel.scheduleInspection).toHaveBeenCalledWith(
      1,
      5,
      "2026-07-30T10:00:00"
    );

    expect(res.status).toHaveBeenCalledWith(201);

    // Your actual controller returns message + inspection object.
    expect(res.json).toHaveBeenCalledWith({
      message: "Inspection scheduled successfully.",
      inspection: mockInspection
    });
  });

  test("cancelInspection should cancel scheduled inspection", async () => {
    const req = {
      user: { sub: 5 },
      params: { inspectionId: "10" }
    };

    const res = mockResponse();

    const mockCancelledInspection = {
      inspection_id: 10,
      inspection_status: "Cancelled"
    };

    inspectionModel.cancelInspection.mockResolvedValue(mockCancelledInspection);

    await inspectionController.cancelInspection(req, res);

    // Your controller converts inspectionId to Number(), so expect 10, not "10".
    expect(inspectionModel.cancelInspection).toHaveBeenCalledWith(10, 5);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Inspection cancelled successfully.",
      inspection: mockCancelledInspection
    });
  });

  test("completeInspectionResult should save result and hygiene grade", async () => {
    const req = {
      user: { sub: 5 },
      params: { inspectionId: "10" },
      body: {
        score: 88,
        hygiene_grade: "A",
        result: "Pass",
        remarks: "Good hygiene standard."
      }
    };

    const res = mockResponse();

    const mockCompletedInspection = {
      inspection_id: 10,
      score: 88,
      hygiene_grade: "A",
      result: "Pass",
      inspection_status: "Completed"
    };

    inspectionModel.completeInspectionResult.mockResolvedValue(mockCompletedInspection);

    await inspectionController.completeInspectionResult(req, res);

    // Your controller converts inspectionId to Number(), so expect 10.
    expect(inspectionModel.completeInspectionResult).toHaveBeenCalledWith(
      10,
      5,
      88,
      "A",
      "Good hygiene standard.",
      "Pass"
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: "Inspection result recorded successfully.",
      inspection: mockCompletedInspection
    });
  });
});