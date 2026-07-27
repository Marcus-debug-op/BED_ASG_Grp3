const express = require("express");
const vendorStallController = require("../Controllers/vendorStallController");
const uploadStallImage = require("../Middlewares/uploadStallImage");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/my-stalls", requireRole("vendor"), vendorStallController.getMyStalls);

// BED-147: vendor-only, ownership-checked in the controller (403 if the
// stall belongs to a different vendor).
router.patch(
  "/stalls/:stallId/profile-picture",
  requireRole("vendor"),
  uploadStallImage.single("stallImage"),
  vendorStallController.uploadStallProfilePicture
  /*
    #swagger.tags = ['Vendor Stalls']
    #swagger.description = 'BED-147: Vendor uploads/replaces the profile picture for a stall they own. Returns 403 if the stall belongs to a different vendor, 404 if the stall does not exist.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['stallImage'] = { in: 'formData', type: 'file', required: true, description: 'The new stall profile picture.' }
  */
);

module.exports = router;