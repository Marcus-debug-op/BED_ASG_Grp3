const vendorStallController = require("../../Controllers/vendorStallController");
const vendorStallModel = require("../../Models/vendorStallModel");

jest.mock("../Models/vendorStallModel");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("vendorStallController.uploadStallProfilePicture (BED-147)", () => {
  test("returns 200 with the updated image on success", async () => {
    vendorStallModel.getStallOwner.mockResolvedValue({ stall_id: 1, vendor_id: 42 });
    vendorStallModel.updateStallImage.mockResolvedValue({
      stall_id: 1,
      stall_name: "Lao Ban Soya Beancurd",
      image_url: "uploads/stalls/123-photo.jpg"
    });

    const req = {
      user: { sub: 42 },
      params: { stallId: "1" },
      file: { filename: "123-photo.jpg" }
    };
    const res = mockResponse();

    await vendorStallController.uploadStallProfilePicture(req, res);

    expect(vendorStallModel.updateStallImage).toHaveBeenCalledWith(1, "uploads/stalls/123-photo.jpg");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ stall_id: 1, image_url: "uploads/stalls/123-photo.jpg" })
    );
  });

  test("returns 400 when no file was uploaded", async () => {
    const req = { user: { sub: 42 }, params: { stallId: "1" }, file: undefined };
    const res = mockResponse();

    await vendorStallController.uploadStallProfilePicture(req, res);

    expect(vendorStallModel.getStallOwner).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the stall does not exist", async () => {
    vendorStallModel.getStallOwner.mockResolvedValue(null);

    const req = { user: { sub: 42 }, params: { stallId: "999" }, file: { filename: "x.jpg" } };
    const res = mockResponse();

    await vendorStallController.uploadStallProfilePicture(req, res);

    expect(vendorStallModel.updateStallImage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 403 when the stall belongs to a different vendor", async () => {
    vendorStallModel.getStallOwner.mockResolvedValue({ stall_id: 1, vendor_id: 999 });

    const req = { user: { sub: 42 }, params: { stallId: "1" }, file: { filename: "x.jpg" } };
    const res = mockResponse();

    await vendorStallController.uploadStallProfilePicture(req, res);

    expect(vendorStallModel.updateStallImage).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test("returns 500 on an unexpected database error", async () => {
    vendorStallModel.getStallOwner.mockRejectedValue(new Error("connection lost"));

    const req = { user: { sub: 42 }, params: { stallId: "1" }, file: { filename: "x.jpg" } };
    const res = mockResponse();

    await vendorStallController.uploadStallProfilePicture(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
