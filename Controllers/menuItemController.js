const menuItemModel = require("../Models/menuItemModel");

// Lets the front-end populate a cuisine checklist when adding/editing a dish.
async function getCuisines(req, res) {
  try {
    const cuisines = await menuItemModel.getAllCuisines();
    res.status(200).json(cuisines);
  } catch (error) {
    console.error("Error getting cuisines:", error);

    res.status(500).json({
      message: "Unable to load cuisines."
    });
  }
}

async function getMenuByStall(req, res) {
  try {
    const vendorId = req.user.sub; // Logged-in vendor's user ID from the JWT subject claim.
    const stallId = Number(req.params.stallId);

    const items = await menuItemModel.getMenuItemsByStall(stallId, vendorId);

    if (items === null) {
      return res.status(403).json({
        message: "You do not own this stall."
      });
    }

    res.status(200).json(items);
  } catch (error) {
    console.error("Error getting menu items:", error);

    res.status(500).json({
      message: "Unable to load menu items."
    });
  }
}

async function createMenuItem(req, res) {
  try {
    const vendorId = req.user.sub;
    const stallId = Number(req.params.stallId);

    const created = await menuItemModel.createMenuItem(stallId, vendorId, req.body);

    if (created === null) {
      return res.status(403).json({
        message: "You do not own this stall."
      });
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating menu item:", error);

    res.status(500).json({
      message: "Unable to create menu item."
    });
  }
}

async function updateMenuItem(req, res) {
  try {
    const vendorId = req.user.sub;
    const menuItemId = Number(req.params.menuItemId);

    const updated = await menuItemModel.updateMenuItem(menuItemId, vendorId, req.body);

    if (!updated) {
      return res.status(404).json({
        message: "Menu item not found."
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating menu item:", error);

    res.status(500).json({
      message: "Unable to update menu item."
    });
  }
}

async function setAvailability(req, res) {
  try {
    const vendorId = req.user.sub;
    const menuItemId = Number(req.params.menuItemId);
    const { is_available } = req.body;

    const updated = await menuItemModel.setMenuItemAvailability(menuItemId, vendorId, is_available);

    if (!updated) {
      return res.status(404).json({
        message: "Menu item not found."
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating menu item availability:", error);

    res.status(500).json({
      message: "Unable to update menu item availability."
    });
  }
}

async function deleteMenuItem(req, res) {
  try {
    const vendorId = req.user.sub;
    const menuItemId = Number(req.params.menuItemId);

    const deleted = await menuItemModel.deleteMenuItem(menuItemId, vendorId);

    if (!deleted) {
      return res.status(404).json({
        message: "Menu item not found."
      });
    }

    res.status(200).json({
      message: "Menu item deleted."
    });
  } catch (error) {
    console.error("Error deleting menu item:", error);

    // SQL Server FK violation (e.g. item referenced by existing OrderItems rows).
    if (error.number === 547) {
      return res.status(409).json({
        message: "This item has past orders and cannot be deleted. Mark it unavailable instead."
      });
    }

    res.status(500).json({
      message: "Unable to delete menu item."
    });
  }
}

module.exports = {
  getCuisines,
  getMenuByStall,
  createMenuItem,
  updateMenuItem,
  setAvailability,
  deleteMenuItem
};