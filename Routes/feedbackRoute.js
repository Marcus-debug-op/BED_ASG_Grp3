const express = require("express");
const feedbackController = require("../Controllers/feedbackController");
const { requireRole, blockGuests } = require("../Middlewares/authMiddleware");
const { validateFeedback } = require("../Middlewares/feedbackValidation");
const uploadFeedbackImage = require("../Middlewares/uploadFeedbackImage");

const router = express.Router();

// BED-2: blockGuests instead of requireAuth - guests hold a valid token too,
// so requireAuth alone would let them submit feedback. Only registered
// patrons (non-guest) may rate/comment on a stall.
// BED-132: uploadFeedbackImage runs before validation so Multer has already
// parsed multipart fields into req.body by the time Joi checks it; the
// photo itself is optional (a text-only review still succeeds).
router.post("/feedback", blockGuests, uploadFeedbackImage, validateFeedback, feedbackController.submitFeedback
  /*
    #swagger.tags = ['Patron - Feedback']
    #swagger.description = 'BED-2/BED-132: Submit a rating, comment, and optional photo for a stall. Registered patrons only - guests are rejected. Returns 413 if the photo exceeds 5MB.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['image'] = { in: 'formData', type: 'file', required: false, description: 'Optional photo to attach to the review.' }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        stall_id: 5,
        rating: 4,
        comment: 'Great food, friendly service!'
      }
    }
  */
);
router.get("/vendor/feedback", requireRole("vendor"), feedbackController.getVendorFeedback
  /*
    #swagger.tags = ['Vendor - Feedback']
    #swagger.description = 'BED-2: Vendor retrieves feedback left for their own stall(s) only.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

// BED-92: same reasoning - only a registered patron can edit/delete their own feedback.
router.put("/feedback/:feedbackId", blockGuests, validateFeedback, feedbackController.updateFeedback
  /*
    #swagger.tags = ['Patron - Feedback']
    #swagger.description = 'BED-92: Edit your own feedback. Returns 403 if the feedback belongs to a different patron.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        stall_id: 5,
        rating: 3,
        comment: 'Updated my review after a second visit.'
      }
    }
  */
);
router.delete("/feedback/:feedbackId", blockGuests, feedbackController.deleteFeedback
  /*
    #swagger.tags = ['Patron - Feedback']
    #swagger.description = 'BED-92: Delete your own feedback. Returns 403 if the feedback belongs to a different patron.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

module.exports = router;