const express = require("express");
const vendorComplaintController = require("../Controllers/vendorComplaintController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

// Vendor-only, scoped to their own stalls. Deliberately no full status control
// or delete here - that authority stays with NEA officers via /api/complaints.
router.get("/", requireRole("vendor"), vendorComplaintController.listMyComplaints);
router.get("/:complaintId", requireRole("vendor"), vendorComplaintController.getMyComplaint);
router.patch("/:complaintId/acknowledge", requireRole("vendor"), vendorComplaintController.acknowledgeMyComplaint);

module.exports = router;
