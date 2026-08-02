const express = require("express");
const vendorComplaintController = require("../Controllers/vendorComplaintController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

// Vendor-only, scoped to their own stalls. Deliberately no full status control
// or delete here - that authority stays with NEA officers via /api/complaints.
router.get("/", requireRole("vendor"), vendorComplaintController.listMyComplaints
/*
  #swagger.tags = ['Vendor - Complaints']
  #swagger.description = 'Vendor lists complaints that have been filed against their own stalls, so they can stay aware of open issues.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.get("/:complaintId", requireRole("vendor"), vendorComplaintController.getMyComplaint
/*
  #swagger.tags = ['Vendor - Complaints']
  #swagger.description = 'Vendor retrieves the detail of one complaint filed against their own stall.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.patch("/:complaintId/acknowledge", requireRole("vendor"), vendorComplaintController.acknowledgeMyComplaint
/*
  #swagger.tags = ['Vendor - Complaints']
  #swagger.description = 'Vendor acknowledges a complaint filed against their own stall, confirming they have seen it. This does not change the complaint status or resolution, which remain under officer/operator control.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

module.exports = router;