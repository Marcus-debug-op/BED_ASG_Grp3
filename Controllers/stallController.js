const stallModel = require("../Models/stallModel");

// BED-61: Stall Listing API
// GET /api/stalls?search=laksa&cuisine=Chinese Cuisine
async function getStalls(req, res) {
  try {
    const filters = {
      search: req.query.search,
      cuisine: req.query.cuisine,
      hawkerCentreId: req.query.hawker_centre_id
    };

    const stalls = await stallModel.getAllStalls(filters);

    res.status(200).json(stalls);
  } catch (error) {
    console.error("Error getting stalls:", error);

    res.status(500).json({
      message: "Unable to load stalls."
    });
  }
}

module.exports = {
  getStalls
};