const stallController = require("../../Controllers/stallController");
const stallModel = require("../../Models/stallModel");

jest.mock("../Models/stallModel");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("stallController.getStalls dietary filter (BED-148)", () => {
  test("splits a comma-separated dietary query param into an array for the model", async () => {
    stallModel.getAllStalls.mockResolvedValue([]);

    const req = { query: { dietary: "Halal, Vegetarian" } };
    const res = mockResponse();

    await stallController.getStalls(req, res);

    expect(stallModel.getAllStalls).toHaveBeenCalledWith(
      expect.objectContaining({ dietary: ["Halal", "Vegetarian"] })
    );
  });

  test("passes an empty array when no dietary filter is given", async () => {
    stallModel.getAllStalls.mockResolvedValue([]);

    const req = { query: {} };
    const res = mockResponse();

    await stallController.getStalls(req, res);

    expect(stallModel.getAllStalls).toHaveBeenCalledWith(
      expect.objectContaining({ dietary: [] })
    );
  });

  test("returns 200 with an empty array when no stalls match the dietary filter", async () => {
    stallModel.getAllStalls.mockResolvedValue([]);

    const req = { query: { dietary: "NotARealTag" } };
    const res = mockResponse();

    await stallController.getStalls(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});
