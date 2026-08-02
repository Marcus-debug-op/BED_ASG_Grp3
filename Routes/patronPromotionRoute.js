const express = require("express");
const promotionController = require("../Controllers/promotionController");
const { requireRole } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.get("/available", requireRole("patron"), promotionController.getAvailablePromotions
/*
  #swagger.tags = ['Patron - Promotions']
  #swagger.description = 'Patron views every promotion code they could still apply right now, across all stalls. Only includes promos that are active, within their date range, on an active stall, not already redeemed by this patron, and under any redemption cap - so anything shown here is guaranteed to still work if the patron tries to use it at checkout.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

module.exports = router;
