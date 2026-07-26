const rentalAgreementModel = require("../Models/rentalAgreementModel");

const VALID_STATUSES = ["Active", "Expired", "Terminated"];

function validateAgreementPayload(body) {
  const { stall_id, lease_start_date, lease_end_date, monthly_rent } = body;

  if (!stall_id || !lease_start_date || !lease_end_date || monthly_rent === undefined) {
    return "stall_id, lease_start_date, lease_end_date, and monthly_rent are all required.";
  }

  if (Number.isNaN(Number(monthly_rent)) || Number(monthly_rent) <= 0) {
    return "monthly_rent must be a positive number.";
  }

  if (new Date(lease_end_date) < new Date(lease_start_date)) {
    return "lease_end_date cannot be before lease_start_date.";
  }

  return null;
}

// POST /api/operator/rental-agreements
async function createAgreement(req, res) {
  try {
    const validationError = validateAgreementPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const stallId = Number(req.body.stall_id);

    // Acceptance criteria: "Operator cannot create a rental agreement for
    // a stall that does not exist." (The "stall without an assigned
    // vendor" case is already impossible - Stalls.vendor_id is NOT NULL.)
    const stallFound = await rentalAgreementModel.stallExists(stallId);
    if (!stallFound) {
      return res.status(404).json({ message: "Stall not found." });
    }

    const agreement = await rentalAgreementModel.createAgreement({
      stall_id: stallId,
      lease_start_date: req.body.lease_start_date,
      lease_end_date: req.body.lease_end_date,
      monthly_rent: req.body.monthly_rent
    });

    res.status(201).json(agreement);
  } catch (error) {
    console.error("Error creating rental agreement:", error);

    res.status(500).json({
      message: "Unable to create rental agreement."
    });
  }
}

// GET /api/operator/rental-agreements
async function listAgreements(req, res) {
  try {
    const agreements = await rentalAgreementModel.getAllAgreements();
    res.status(200).json(agreements);
  } catch (error) {
    console.error("Error listing rental agreements:", error);

    res.status(500).json({
      message: "Unable to load rental agreements."
    });
  }
}

// GET /api/operator/rental-agreements/:agreementId
async function getAgreement(req, res) {
  try {
    const agreementId = Number(req.params.agreementId);

    if (Number.isNaN(agreementId)) {
      return res.status(400).json({ message: "Invalid agreement ID." });
    }

    const agreement = await rentalAgreementModel.getAgreementById(agreementId);

    if (!agreement) {
      return res.status(404).json({ message: "Rental agreement not found." });
    }

    res.status(200).json(agreement);
  } catch (error) {
    console.error("Error getting rental agreement:", error);

    res.status(500).json({
      message: "Unable to load rental agreement."
    });
  }
}

// PUT /api/operator/rental-agreements/:agreementId
async function updateAgreement(req, res) {
  try {
    const agreementId = Number(req.params.agreementId);

    if (Number.isNaN(agreementId)) {
      return res.status(400).json({ message: "Invalid agreement ID." });
    }

    const { lease_start_date, lease_end_date, monthly_rent, agreement_status } = req.body;

    if (!lease_start_date || !lease_end_date || monthly_rent === undefined || !agreement_status) {
      return res.status(400).json({
        message: "lease_start_date, lease_end_date, monthly_rent, and agreement_status are all required."
      });
    }

    if (!VALID_STATUSES.includes(agreement_status)) {
      return res.status(400).json({
        message: `agreement_status must be one of: ${VALID_STATUSES.join(", ")}.`
      });
    }

    if (new Date(lease_end_date) < new Date(lease_start_date)) {
      return res.status(400).json({ message: "lease_end_date cannot be before lease_start_date." });
    }

    const updated = await rentalAgreementModel.updateAgreement(agreementId, {
      lease_start_date,
      lease_end_date,
      monthly_rent,
      agreement_status
    });

    if (!updated) {
      return res.status(404).json({ message: "Rental agreement not found." });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating rental agreement:", error);

    res.status(500).json({
      message: "Unable to update rental agreement."
    });
  }
}

module.exports = {
  createAgreement,
  listAgreements,
  getAgreement,
  updateAgreement
};
