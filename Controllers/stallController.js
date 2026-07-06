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

// BED-62: Menu Display API
// GET /api/stalls/:stallId/menu
async function getStallMenu(req, res) {
  try {
    const stallId = parseInt(req.params.stallId, 10);

    if (Number.isNaN(stallId)) {
      return res.status(400).json({
        message: "Invalid stall ID."
      });
    }

    const data = await stallModel.getMenuByStallId(stallId);

    if (!data) {
      return res.status(404).json({
        message: "Stall not found."
      });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Error getting stall menu:", error);

    res.status(500).json({
      message: "Unable to load menu."
    });
  }
}

module.exports = {
  getStalls,
  getStallMenu
};