const rentalAgreementModel = require("../Models/rentalAgreementModel");

// GET /api/vendor/rental-agreements - always scoped to the logged-in
// vendor's own stalls, mirroring vendorComplaintController's pattern.
async function listMyAgreements(req, res) {
  try {
    const vendorId = req.user.sub;

    const agreements = await rentalAgreementModel.getAgreementsForVendor(vendorId);

    res.status(200).json(agreements);
  } catch (error) {
    console.error("Error listing vendor rental agreements:", error);

    res.status(500).json({
      message: "Unable to load rental agreements."
    });
  }
}

// GET /api/vendor/rental-agreements/:agreementId
async function getMyAgreement(req, res) {
  try {
    const vendorId = req.user.sub;
    const agreementId = Number(req.params.agreementId);

    if (Number.isNaN(agreementId)) {
      return res.status(400).json({ message: "Invalid agreement ID." });
    }

    const agreement = await rentalAgreementModel.getAgreementByIdForVendor(agreementId, vendorId);

    if (!agreement) {
      return res.status(404).json({ message: "Rental agreement not found." });
    }

    res.status(200).json(agreement);
  } catch (error) {
    console.error("Error getting vendor rental agreement:", error);

    res.status(500).json({
      message: "Unable to load rental agreement."
    });
  }
}

// PATCH /api/vendor/rental-agreements/:agreementId/accept - the vendor's
// only write action here. No editing of rental_fee, lease dates, or
// agreement_status - those stay operator-controlled via BED-23.
async function acceptMyAgreement(req, res) {
  try {
    const vendorId = req.user.sub;
    const agreementId = Number(req.params.agreementId);

    if (Number.isNaN(agreementId)) {
      return res.status(400).json({ message: "Invalid agreement ID." });
    }

    const result = await rentalAgreementModel.acceptAgreement(agreementId, vendorId);

    if (result.outcome === "not_found") {
      return res.status(404).json({ message: "Rental agreement not found." });
    }

    if (result.outcome === "already_accepted") {
      return res.status(409).json({
        message: "This agreement has already been accepted.",
        agreement: result.agreement
      });
    }

    res.status(200).json(result.agreement);
  } catch (error) {
    console.error("Error accepting rental agreement:", error);

    res.status(500).json({
      message: "Unable to accept rental agreement."
    });
  }
}

module.exports = {
  listMyAgreements,
  getMyAgreement,
  acceptMyAgreement
};
