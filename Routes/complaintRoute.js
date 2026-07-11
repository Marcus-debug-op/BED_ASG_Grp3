const express = require("express");
const complaintController = require("../Controllers/complaintController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateStatusUpdate } = require("../Middlewares/complaintValidation");

const router = express.Router();

// Officer + Operator: reviewing and resolving complaints filed against
// vendors. Which role can act on which complaint is enforced per-request
// in the controller, based on complaint_type (Hygiene -> officer, else
// -> operator) - not by role alone.
router.get("/", requireRole("officer", "operator"), complaintController.listComplaints);
router.get("/:complaintId", requireRole("officer", "operator"), complaintController.getComplaint);
router.patch("/:complaintId", requireRole("officer", "operator"), validateStatusUpdate, complaintController.updateComplaint);

module.exports = router;