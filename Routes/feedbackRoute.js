const express = require("express");
const feedbackController = require("../Controllers/feedbackController");
const { requireAuth, requireRole } = require("../Middlewares/authMiddleware");
const { validateFeedback } = require("../Middlewares/feedbackValidation");

const router = express.Router();

// BED-2
router.post("/feedback", requireAuth, validateFeedback, feedbackController.submitFeedback);
router.get("/vendor/feedback", requireRole("vendor"), feedbackController.getVendorFeedback);

// BED-92
router.put("/feedback/:feedbackId", requireAuth, validateFeedback, feedbackController.updateFeedback);
router.delete("/feedback/:feedbackId", requireAuth, feedbackController.deleteFeedback);

module.exports = router;