const rentalAgreementController = require("../Controllers/rentalAgreementController");
const rentalAgreementModel = require("../Models/rentalAgreementModel");

/*
  Unit tests for BED-23 (operator rental agreement management), following
  the same jest.mock() isolation pattern used for Sprint 1/2
  (stallController, feedbackController, likeController).
*/

jest.mock("../Models/rentalAgreementModel");

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe("rentalAgreementController.createAgreement (BED-23)", () => {
  test("returns 201 with the created agreement on success", async () => {
    rentalAgreementModel.stallExists.mockResolvedValue(true);
    const created = { rental_agreement_id: 1, stall_id: 5, monthly_rent: 1200 };
    rentalAgreementModel.createAgreement.mockResolvedValue(created);

    const req = {
      body: { stall_id: 5, lease_start_date: "2026-01-01", lease_end_date: "2026-12-31", monthly_rent: 1200 }
    };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test("returns 400 when required fields are missing, without checking the stall", async () => {
    const req = { body: { stall_id: 5 } };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(rentalAgreementModel.stallExists).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when lease_end_date is before lease_start_date", async () => {
    const req = {
      body: { stall_id: 5, lease_start_date: "2026-12-31", lease_end_date: "2026-01-01", monthly_rent: 1200 }
    };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the stall does not exist, without creating an agreement", async () => {
    rentalAgreementModel.stallExists.mockResolvedValue(false);

    const req = {
      body: { stall_id: 9999, lease_start_date: "2026-01-01", lease_end_date: "2026-12-31", monthly_rent: 1200 }
    };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(rentalAgreementModel.createAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("rentalAgreementController.listAgreements / getAgreement (BED-23)", () => {
  test("listAgreements returns 200 with all agreements", async () => {
    const agreements = [{ rental_agreement_id: 1 }, { rental_agreement_id: 2 }];
    rentalAgreementModel.getAllAgreements.mockResolvedValue(agreements);

    const res = mockResponse();
    await rentalAgreementController.listAgreements({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(agreements);
  });

  test("getAgreement returns 404 when it does not exist", async () => {
    rentalAgreementModel.getAgreementById.mockResolvedValue(null);

    const req = { params: { agreementId: "999" } };
    const res = mockResponse();

    await rentalAgreementController.getAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("rentalAgreementController.updateAgreement (BED-23)", () => {
  test("returns 200 with the updated agreement on success", async () => {
    const updated = { rental_agreement_id: 1, agreement_status: "Active" };
    rentalAgreementModel.updateAgreement.mockResolvedValue(updated);

    const req = {
      params: { agreementId: "1" },
      body: { lease_start_date: "2026-01-01", lease_end_date: "2026-12-31", monthly_rent: 1300, agreement_status: "Active" }
    };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test("returns 400 for an invalid agreement_status", async () => {
    const req = {
      params: { agreementId: "1" },
      body: { lease_start_date: "2026-01-01", lease_end_date: "2026-12-31", monthly_rent: 1300, agreement_status: "Bogus" }
    };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(rentalAgreementModel.updateAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the agreement does not exist", async () => {
    rentalAgreementModel.updateAgreement.mockResolvedValue(null);

    const req = {
      params: { agreementId: "999" },
      body: { lease_start_date: "2026-01-01", lease_end_date: "2026-12-31", monthly_rent: 1300, agreement_status: "Active" }
    };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
