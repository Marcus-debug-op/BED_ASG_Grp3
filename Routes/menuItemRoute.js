const express = require("express");
const menuItemController = require("../Controllers/menuItemController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateMenuItem, validateAvailability } = require("../Middlewares/menuItemValidation");

const router = express.Router();

// All menu management routes are vendor-only.
router.get("/stall/:stallId", requireRole("vendor"), menuItemController.getMenuByStall);
router.post("/stall/:stallId", requireRole("vendor"), validateMenuItem, menuItemController.createMenuItem);

router.put("/:menuItemId", requireRole("vendor"), validateMenuItem, menuItemController.updateMenuItem);
router.patch("/:menuItemId/availability", requireRole("vendor"), validateAvailability, menuItemController.setAvailability);
router.delete("/:menuItemId", requireRole("vendor"), menuItemController.deleteMenuItem);

module.exports = router;