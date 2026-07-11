const express = require("express");
const complaintController = require("../Controllers/complaintController");
const { requireRole, blockGuests } = require("../Middlewares/authMiddleware");
const { validateStatusUpdate, validateComplaintSubmission } = require("../Middlewares/complaintValidation");

const router = express.Router();

// Any registered (non-guest) user can file a new complaint. Guests are
// blocked since Complaints.patron_id is a NOT NULL FK to Users - there's
// no row to attach a guest's complaint to.
router.post("/", blockGuests, validateComplaintSubmission, complaintController.submitComplaint);

// Officer + Operator: reviewing and resolving complaints filed against
// vendors. Which role can act on which complaint is enforced per-request
// in the controller, based on complaint_type (Hygiene -> officer, else
// -> operator) - not by role alone.
router.get("/", requireRole("officer", "operator"), complaintController.listComplaints);
router.get("/:complaintId", requireRole("officer", "operator"), complaintController.getComplaint);
router.patch("/:complaintId", requireRole("officer", "operator"), validateStatusUpdate, complaintController.updateComplaint);

module.exports = router;