const express = require("express");
const vendorRentalAgreementController = require("../Controllers/vendorRentalAgreementController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

// BED-74: vendor-only, scoped to their own stalls. Vendors can view and
// accept an agreement, but cannot edit operator-controlled fields like
// rental fee, lease period, or agreement_status - that authority stays
// with the operator via /api/operator/rental-agreements (BED-23).
router.get("/", requireRole("vendor"), vendorRentalAgreementController.listMyAgreements
/*
  #swagger.tags = ['Vendor - Rental Agreements']
  #swagger.description = 'BED-74: Vendor retrieves rental agreements for their own stalls only.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.get("/:agreementId", requireRole("vendor"), vendorRentalAgreementController.getMyAgreement
/*
  #swagger.tags = ['Vendor - Rental Agreements']
  #swagger.description = 'BED-74: Vendor retrieves one rental agreement belonging to their own stall.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.patch("/:agreementId/accept", requireRole("vendor"), vendorRentalAgreementController.acceptMyAgreement
/*
  #swagger.tags = ['Vendor - Rental Agreements']
  #swagger.description = 'BED-74: Vendor accepts a pending rental agreement for their own stall. Returns 409 if already accepted.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

module.exports = router;
