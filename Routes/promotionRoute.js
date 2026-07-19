const express = require("express");
const promotionController = require("../Controllers/promotionController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validatePromotion } = require("../Middlewares/promotionValidation");

const router = express.Router();

// All promotion management routes are vendor-only.
router.get("/stall/:stallId", requireRole("vendor"), promotionController.getPromotionsByStall
/*
  #swagger.tags = ['Vendor Promotions']
  #swagger.description = 'Vendor lists all promotion codes for one of their own stalls, so they can review what is currently running before creating or editing a code.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.post("/stall/:stallId", requireRole("vendor"), validatePromotion, promotionController.createPromotion
/*
  #swagger.tags = ['Vendor Promotions']
  #swagger.description = 'Vendor creates a new promotion code for their own stall (code, discount percentage, validity dates). The code only needs to be unique within that stall - a duplicate code is rejected with a validation error, but two different stalls may use the same code.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.get("/:promotionId", requireRole("vendor"), promotionController.getPromotion
/*
  #swagger.tags = ['Vendor Promotions']
  #swagger.description = 'Vendor retrieves a single promotion code belonging to them, including its current active status and validity dates.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.put("/:promotionId", requireRole("vendor"), validatePromotion, promotionController.updatePromotion
/*
  #swagger.tags = ['Vendor Promotions']
  #swagger.description = 'Vendor updates one of their own promotion codes, e.g. toggling it active/inactive. This never deletes the promotion record - historical promotion data is always preserved.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.delete("/:promotionId", requireRole("vendor"), promotionController.deletePromotion
/*
  #swagger.tags = ['Vendor Promotions']
  #swagger.description = 'Vendor deletes one of their own promotion codes, but ONLY if it was never actually redeemed by a patron. Once a promo has real order/redemption history attached, it can only be deactivated via the update route, never deleted.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

module.exports = router;