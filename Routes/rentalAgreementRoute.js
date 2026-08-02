const express = require("express");
const rentalAgreementController = require("../Controllers/rentalAgreementController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

// BED-23: operator-only. Rental period, fee, and status are entirely
// operator-controlled - vendors get their own read/accept-only routes at
// /api/vendor/rental-agreements (BED-74).
router.post("/", requireRole("operator"), rentalAgreementController.createAgreement
/*
  #swagger.tags = ['Operator - Rental Agreements']
  #swagger.description = 'BED-23: Operator creates a rental agreement for a stall. Fails with 404 if the stall does not exist.'
  #swagger.security = [{ "bearerAuth": [] }]
  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      stall_id: 1,
      lease_start_date: '2026-01-01',
      lease_end_date: '2026-12-31',
      monthly_rent: 1200.00
    }
  }
*/);

router.get("/", requireRole("operator"), rentalAgreementController.listAgreements
/*
  #swagger.tags = ['Operator - Rental Agreements']
  #swagger.description = 'BED-23: Operator retrieves all rental agreements across every vendor and stall.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.get("/:agreementId", requireRole("operator"), rentalAgreementController.getAgreement
/*
  #swagger.tags = ['Operator - Rental Agreements']
  #swagger.description = 'BED-23: Operator retrieves one rental agreement by ID.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.put("/:agreementId", requireRole("operator"), rentalAgreementController.updateAgreement
/*
  #swagger.tags = ['Operator - Rental Agreements']
  #swagger.description = 'BED-23: Operator updates rental period, fee, and/or agreement status.'
  #swagger.security = [{ "bearerAuth": [] }]
  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: {
      lease_start_date: '2026-01-01',
      lease_end_date: '2027-01-31',
      monthly_rent: 1300.00,
      agreement_status: 'Active'
    }
  }
*/);

router.delete("/:agreementId", requireRole("operator"), rentalAgreementController.deleteAgreement
/*
  #swagger.tags = ['Operator - Rental Agreements']
  #swagger.description = 'BED-23: Operator permanently deletes a rental agreement. Returns 404 if the agreement does not exist.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

module.exports = router;
