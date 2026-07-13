const express = require("express");
const promotionController = require("../Controllers/promotionController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validatePromotion, validatePromotionActive } = require("../Middlewares/promotionValidation");

const router = express.Router();

// All promotion management routes are vendor-only.
router.get("/stall/:stallId", requireRole("vendor"), promotionController.getPromotionsByStall);
router.post("/stall/:stallId", requireRole("vendor"), validatePromotion, promotionController.createPromotion);

router.put("/:promotionId", requireRole("vendor"), validatePromotion, promotionController.updatePromotion);
router.patch("/:promotionId/active", requireRole("vendor"), validatePromotionActive, promotionController.setActive);
router.delete("/:promotionId", requireRole("vendor"), promotionController.deletePromotion);

module.exports = router;
