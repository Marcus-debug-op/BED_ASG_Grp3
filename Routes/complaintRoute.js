const express = require("express");
const complaintController = require("../Controllers/complaintController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateStatusUpdate } = require("../Middlewares/complaintValidation");

const router = express.Router();

// Officer-only: reviewing and resolving complaints filed against vendors.
router.get("/", requireRole("officer"), complaintController.listComplaints);
router.get("/:complaintId", requireRole("officer"), complaintController.getComplaint);
router.patch("/:complaintId", requireRole("officer"), validateStatusUpdate, complaintController.updateComplaint);

module.exports = router;