const express = require("express");
const promotionController = require("../Controllers/promotionController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validatePromotion } = require("../Middlewares/promotionValidation");

const router = express.Router();

// All promotion management routes are vendor-only.
router.get("/stall/:stallId", requireRole("vendor"), promotionController.getPromotionsByStall);
router.post("/stall/:stallId", requireRole("vendor"), validatePromotion, promotionController.createPromotion);

router.get("/:promotionId", requireRole("vendor"), promotionController.getPromotion);
router.put("/:promotionId", requireRole("vendor"), validatePromotion, promotionController.updatePromotion);

module.exports = router;
