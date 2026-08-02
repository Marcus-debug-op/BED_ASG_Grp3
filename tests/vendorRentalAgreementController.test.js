const rentalAgreementController = require("../Controllers/rentalAgreementController");
const rentalAgreementModel = require("../Models/rentalAgreementModel");

/*
  Unit tests for BED-23: Operator Rental Agreement Management.
  Covers all five controller methods - createAgreement, listAgreements,
  getAgreement, updateAgreement and deleteAgreement.

  Models/rentalAgreementModel is replaced with a jest.mock(), so these
  tests never open a database connection: each test tells the mock what to
  return (or throw) and then asserts on the status code and payload the
  controller sent back. Same isolation pattern used by the Sprint 1/2
  controller tests in this project.
*/

jest.mock("../Models/rentalAgreementModel");

// Chainable res, mirroring Express's real res.status(...).json(...).
function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// A complete, valid create payload. Individual tests spread this and
// override just the field under test, so a test that's about (say) an
// invalid rent isn't also silently missing a date.
function validCreateBody(overrides = {}) {
  return {
    stall_id: 5,
    lease_start_date: "2026-01-01",
    lease_end_date: "2026-12-31",
    monthly_rent: 1200,
    ...overrides
  };
}

function validUpdateBody(overrides = {}) {
  return {
    lease_start_date: "2026-01-01",
    lease_end_date: "2026-12-31",
    monthly_rent: 1300,
    agreement_status: "Active",
    ...overrides
  };
}

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------
// createAgreement - POST /api/operator/rental-agreements
// ---------------------------------------------------------------------
describe("rentalAgreementController.createAgreement (BED-23)", () => {
  test("returns 201 with the created agreement on success", async () => {
    rentalAgreementModel.stallExists.mockResolvedValue(true);
    const created = { rental_agreement_id: 1, stall_id: 5, monthly_rent: 1200 };
    rentalAgreementModel.createAgreement.mockResolvedValue(created);

    const req = { body: validCreateBody() };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(rentalAgreementModel.createAgreement).toHaveBeenCalledWith(
      expect.objectContaining({ stall_id: 5, monthly_rent: 1200 })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test("returns 400 when a required field is missing, without checking the stall", async () => {
    const req = { body: { stall_id: 5 } };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(rentalAgreementModel.stallExists).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when monthly_rent is zero or negative", async () => {
    const req = { body: validCreateBody({ monthly_rent: 0 }) };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(rentalAgreementModel.createAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when monthly_rent is not a number", async () => {
    const req = { body: validCreateBody({ monthly_rent: "abc" }) };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when lease_end_date is before lease_start_date", async () => {
    const req = {
      body: validCreateBody({ lease_start_date: "2026-12-31", lease_end_date: "2026-01-01" })
    };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  /*
    Acceptance criteria: "Operator cannot create a rental agreement for a
    stall that does not exist." The insert must not be attempted at all.
  */
  test("returns 404 when the stall does not exist, without creating an agreement", async () => {
    rentalAgreementModel.stallExists.mockResolvedValue(false);

    const req = { body: validCreateBody({ stall_id: 9999 }) };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(rentalAgreementModel.createAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 500 on an unexpected database error", async () => {
    rentalAgreementModel.stallExists.mockRejectedValue(new Error("connection lost"));

    const req = { body: validCreateBody() };
    const res = mockResponse();

    await rentalAgreementController.createAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------
// listAgreements - GET /api/operator/rental-agreements
// ---------------------------------------------------------------------
describe("rentalAgreementController.listAgreements (BED-23)", () => {
  test("returns 200 with every agreement", async () => {
    const agreements = [{ rental_agreement_id: 1 }, { rental_agreement_id: 2 }];
    rentalAgreementModel.getAllAgreements.mockResolvedValue(agreements);

    const res = mockResponse();
    await rentalAgreementController.listAgreements({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(agreements);
  });

  test("returns 200 with an empty array when there are no agreements", async () => {
    rentalAgreementModel.getAllAgreements.mockResolvedValue([]);

    const res = mockResponse();
    await rentalAgreementController.listAgreements({}, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  test("returns 500 when the model throws", async () => {
    rentalAgreementModel.getAllAgreements.mockRejectedValue(new Error("DB error"));

    const res = mockResponse();
    await rentalAgreementController.listAgreements({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------
// getAgreement - GET /api/operator/rental-agreements/:agreementId
// ---------------------------------------------------------------------
describe("rentalAgreementController.getAgreement (BED-23)", () => {
  test("returns 200 with the agreement on success", async () => {
    const agreement = { rental_agreement_id: 1, stall_name: "Laksa Legend" };
    rentalAgreementModel.getAgreementById.mockResolvedValue(agreement);

    const req = { params: { agreementId: "1" } };
    const res = mockResponse();

    await rentalAgreementController.getAgreement(req, res);

    expect(rentalAgreementModel.getAgreementById).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(agreement);
  });

  test("returns 400 for a non-numeric agreement ID without touching the model", async () => {
    const req = { params: { agreementId: "abc" } };
    const res = mockResponse();

    await rentalAgreementController.getAgreement(req, res);

    expect(rentalAgreementModel.getAgreementById).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the agreement does not exist", async () => {
    rentalAgreementModel.getAgreementById.mockResolvedValue(null);

    const req = { params: { agreementId: "999" } };
    const res = mockResponse();

    await rentalAgreementController.getAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 500 on an unexpected database error", async () => {
    rentalAgreementModel.getAgreementById.mockRejectedValue(new Error("connection lost"));

    const req = { params: { agreementId: "1" } };
    const res = mockResponse();

    await rentalAgreementController.getAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------
// updateAgreement - PUT /api/operator/rental-agreements/:agreementId
// ---------------------------------------------------------------------
describe("rentalAgreementController.updateAgreement (BED-23)", () => {
  test("returns 200 with the updated agreement on success", async () => {
    const updated = { rental_agreement_id: 1, agreement_status: "Active" };
    rentalAgreementModel.updateAgreement.mockResolvedValue(updated);

    const req = { params: { agreementId: "1" }, body: validUpdateBody() };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test("accepts each of the three valid agreement_status values", async () => {
    for (const status of ["Active", "Expired", "Terminated"]) {
      rentalAgreementModel.updateAgreement.mockResolvedValue({ rental_agreement_id: 1 });

      const req = { params: { agreementId: "1" }, body: validUpdateBody({ agreement_status: status }) };
      const res = mockResponse();

      await rentalAgreementController.updateAgreement(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      jest.clearAllMocks();
    }
  });

  test("returns 400 for a non-numeric agreement ID", async () => {
    const req = { params: { agreementId: "abc" }, body: validUpdateBody() };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(rentalAgreementModel.updateAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when a required field is missing", async () => {
    const req = { params: { agreementId: "1" }, body: { monthly_rent: 1300 } };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(rentalAgreementModel.updateAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 for an agreement_status outside the allowed set", async () => {
    const req = {
      params: { agreementId: "1" },
      body: validUpdateBody({ agreement_status: "Bogus" })
    };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(rentalAgreementModel.updateAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 400 when lease_end_date is before lease_start_date", async () => {
    const req = {
      params: { agreementId: "1" },
      body: validUpdateBody({ lease_start_date: "2027-01-01", lease_end_date: "2026-01-01" })
    };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test("returns 404 when the agreement does not exist", async () => {
    rentalAgreementModel.updateAgreement.mockResolvedValue(null);

    const req = { params: { agreementId: "999" }, body: validUpdateBody() };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 500 on an unexpected database error", async () => {
    rentalAgreementModel.updateAgreement.mockRejectedValue(new Error("connection lost"));

    const req = { params: { agreementId: "1" }, body: validUpdateBody() };
    const res = mockResponse();

    await rentalAgreementController.updateAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ---------------------------------------------------------------------
// deleteAgreement - DELETE /api/operator/rental-agreements/:agreementId
// ---------------------------------------------------------------------
describe("rentalAgreementController.deleteAgreement (BED-23)", () => {
  test("returns 200 when the agreement is deleted", async () => {
    rentalAgreementModel.deleteAgreement.mockResolvedValue(true);

    const req = { params: { agreementId: "1" } };
    const res = mockResponse();

    await rentalAgreementController.deleteAgreement(req, res);

    expect(rentalAgreementModel.deleteAgreement).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test("returns 400 for a non-numeric agreement ID without touching the model", async () => {
    const req = { params: { agreementId: "abc" } };
    const res = mockResponse();

    await rentalAgreementController.deleteAgreement(req, res);

    expect(rentalAgreementModel.deleteAgreement).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  /*
    The model returns false when the DELETE matched no rows, so a delete
    against a non-existent id is reported as 404 rather than a misleading
    "deleted successfully".
  */
  test("returns 404 when no row was removed", async () => {
    rentalAgreementModel.deleteAgreement.mockResolvedValue(false);

    const req = { params: { agreementId: "999" } };
    const res = mockResponse();

    await rentalAgreementController.deleteAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("returns 500 on an unexpected database error", async () => {
    rentalAgreementModel.deleteAgreement.mockRejectedValue(new Error("connection lost"));

    const req = { params: { agreementId: "1" } };
    const res = mockResponse();

    await rentalAgreementController.deleteAgreement(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});