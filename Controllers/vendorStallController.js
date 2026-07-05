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

module.exports = {
  getMyStalls
};