const express = require("express");
const menuItemController = require("../Controllers/menuItemController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateMenuItem, validateAvailability } = require("../Middlewares/menuItemValidation");

const router = express.Router();

// All menu management routes are vendor-only.
router.get("/cuisines", requireRole("vendor"), menuItemController.getCuisines
  /*
    #swagger.tags = ['Vendor - Menu']
    #swagger.summary = 'Get available cuisine categories'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.get("/stall/:stallId", requireRole("vendor"), menuItemController.getMenuByStall
  /*
    #swagger.tags = ['Vendor - Menu']
    #swagger.summary = 'Get menu items for a vendor stall'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);
router.post("/stall/:stallId", requireRole("vendor"), validateMenuItem, menuItemController.createMenuItem
  /*
    #swagger.tags = ['Vendor - Menu']
    #swagger.summary = 'Create a menu item'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.put("/:menuItemId", requireRole("vendor"), validateMenuItem, menuItemController.updateMenuItem
  /*
    #swagger.tags = ['Vendor - Menu']
    #swagger.summary = 'Update a menu item'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.patch("/:menuItemId/availability", requireRole("vendor"), validateAvailability, menuItemController.setAvailability
  /*
    #swagger.tags = ['Vendor - Menu']
    #swagger.summary = 'Update menu-item availability'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.delete("/:menuItemId", requireRole("vendor"), menuItemController.deleteMenuItem
  /*
    #swagger.tags = ['Vendor - Menu']
    #swagger.summary = 'Delete a menu item'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);


module.exports = router;