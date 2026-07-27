const operatorStallModel = require("../Models/operatorStallModel");

function handleModelError(result, res) {
  if (result.error === "DUPLICATE_UNIT_NUMBER") {
    res.status(400).json({ message: "That unit number is already assigned to another stall." });
    return true;
  }
  if (result.error === "INVALID_REFERENCE") {
    res.status(400).json({ message: "Invalid vendor_id or hawker_centre_id - that vendor or hawker centre does not exist." });
    return true;
  }
  return false;
}

// POST /api/operator/stalls
async function createStall(req, res) {
  try {
    const result = await operatorStallModel.createStall(req.body);

    if (handleModelError(result, res)) return;

    res.status(201).json(result);
  } catch (error) {
    console.error("Error creating stall:", error);
    res.status(500).json({ message: "Unable to create stall." });
  }
}

// GET /api/operator/stalls
async function getStalls(req, res) {
  try {
    const stalls = await operatorStallModel.getAllStalls();
    res.status(200).json(stalls);
  } catch (error) {
    console.error("Error getting stalls:", error);
    res.status(500).json({ message: "Unable to load stalls." });
  }
}

// GET /api/operator/stalls/:stallId
async function getStallById(req, res) {
  try {
    const stallId = Number(req.params.stallId);

    if (!Number.isInteger(stallId) || stallId <= 0) {
      return res.status(400).json({ message: "Invalid stall id." });
    }

    const stall = await operatorStallModel.getStallById(stallId);

    if (!stall) {
      return res.status(404).json({ message: "Stall not found." });
    }

    res.status(200).json(stall);
  } catch (error) {
    console.error("Error getting stall:", error);
    res.status(500).json({ message: "Unable to load stall." });
  }
}

// PUT /api/operator/stalls/:stallId
async function updateStall(req, res) {
  try {
    const stallId = Number(req.params.stallId);

    if (!Number.isInteger(stallId) || stallId <= 0) {
      return res.status(400).json({ message: "Invalid stall id." });
    }

    const result = await operatorStallModel.updateStall(stallId, req.body);

    if (handleModelError(result, res)) return;

    if (!result) {
      return res.status(404).json({ message: "Stall not found." });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error updating stall:", error);
    res.status(500).json({ message: "Unable to update stall." });
  }
}

// DELETE /api/operator/stalls/:stallId (soft delete - marks inactive)
async function deactivateStall(req, res) {
  try {
    const stallId = Number(req.params.stallId);

    if (!Number.isInteger(stallId) || stallId <= 0) {
      return res.status(400).json({ message: "Invalid stall id." });
    }

    const stall = await operatorStallModel.deactivateStall(stallId);

    if (!stall) {
      return res.status(404).json({ message: "Stall not found." });
    }

    res.status(200).json({ message: "Stall deactivated.", stall });
  } catch (error) {
    console.error("Error deactivating stall:", error);
    res.status(500).json({ message: "Unable to deactivate stall." });
  }
}

// GET /api/operator/stalls/vendors - for the "assign to vendor" dropdown.
async function getVendors(req, res) {
  try {
    const vendors = await operatorStallModel.getVendorOptions();
    res.status(200).json(vendors);
  } catch (error) {
    console.error("Error getting vendors:", error);
    res.status(500).json({ message: "Unable to load vendors." });
  }
}

module.exports = { createStall, getStalls, getStallById, updateStall, deactivateStall, getVendors };
