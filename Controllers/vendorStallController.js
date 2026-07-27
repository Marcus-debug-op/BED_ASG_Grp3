const vendorStallModel = require("../Models/vendorStallModel");

async function getMyStalls(req, res) {
  try {
    const vendorId = req.user.sub; // Retrieve the logged in vendor's user ID from the JWT subject claim.
    const stalls = await vendorStallModel.getStallsByVendorId(vendorId);

    res.status(200).json(stalls);
  } catch (error) {
    console.error("Error getting vendor stalls:", error);

    res.status(500).json({
      message: "Unable to load vendor stalls."
    });
  }
}

// BED-147: PATCH /api/vendor/stalls/:stallId/profile-picture
async function uploadStallProfilePicture(req, res) {
  try {
    const vendorId = req.user.sub;
    const stallId = Number(req.params.stallId);

    if (Number.isNaN(stallId)) {
      return res.status(400).json({ message: "Invalid stall ID." });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded." });
    }

    const stall = await vendorStallModel.getStallOwner(stallId);

    if (!stall) {
      return res.status(404).json({ message: "Stall not found." });
    }

    if (stall.vendor_id !== vendorId) {
      return res.status(403).json({ message: "You do not own this stall." });
    }

    // Stored the same way profileController.uploadMyProfileImage stores its
    // path - a relative path off public/, not the full public/ prefix.
    const imageUrl = `uploads/stalls/${req.file.filename}`;

    const updated = await vendorStallModel.updateStallImage(stallId, imageUrl);

    res.status(200).json({
      message: "Stall profile picture updated successfully.",
      stall_id: updated.stall_id,
      image_url: updated.image_url
    });
  } catch (error) {
    console.error("Error updating stall profile picture:", error);

    res.status(500).json({
      message: "Unable to update stall profile picture."
    });
  }
}

module.exports = {
  getMyStalls,
  uploadStallProfilePicture
};