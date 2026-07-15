const promotionModel = require("../Models/promotionModel");

// GET /api/vendor/promotions/stall/:stallId
async function getPromotionsByStall(req, res) {
  try {
    const vendorId = req.user.sub;
    const stallId = Number(req.params.stallId);

    const promotions = await promotionModel.getPromotionsByStall(stallId, vendorId);

    if (promotions === null) {
      return res.status(403).json({
        message: "You do not own this stall."
      });
    }

    res.status(200).json(promotions);
  } catch (error) {
    console.error("Error getting promotions:", error);

    res.status(500).json({
      message: "Unable to load promotions."
    });
  }
}

// GET /api/vendor/promotions/:promotionId
async function getPromotion(req, res) {
  try {
    const vendorId = req.user.sub;
    const promotionId = Number(req.params.promotionId);

    const promotion = await promotionModel.getPromotionByIdForVendor(promotionId, vendorId);

    if (!promotion) {
      return res.status(404).json({
        message: "Promotion not found."
      });
    }

    res.status(200).json(promotion);
  } catch (error) {
    console.error("Error getting promotion:", error);

    res.status(500).json({
      message: "Unable to load promotion."
    });
  }
}

// POST /api/vendor/promotions/stall/:stallId
async function createPromotion(req, res) {
  try {
    const vendorId = req.user.sub;
    const stallId = Number(req.params.stallId);

    const result = await promotionModel.createPromotion(stallId, vendorId, req.body);

    if (result.outcome === "not_owner") {
      return res.status(403).json({ message: "You do not own this stall." });
    }

    if (result.outcome === "duplicate_code") {
      return res.status(400).json({ message: `Promo code "${req.body.promo_code}" is already in use.` });
    }

    if (result.outcome === "date_overlap") {
      return res.status(409).json({
        message: "This stall already has an active promotion during that date range. Deactivate it first or choose different dates."
      });
    }

    res.status(201).json(result.promotion);
  } catch (error) {
    console.error("Error creating promotion:", error);

    res.status(500).json({
      message: "Unable to create promotion."
    });
  }
}

// PUT /api/vendor/promotions/:promotionId - full update, including toggling
// is_active off. Never deletes the row, so historical/order-linked data stays intact.
async function updatePromotion(req, res) {
  try {
    const vendorId = req.user.sub;
    const promotionId = Number(req.params.promotionId);

    const result = await promotionModel.updatePromotion(promotionId, vendorId, req.body);

    if (result.outcome === "not_found") {
      return res.status(404).json({ message: "Promotion not found." });
    }

    if (result.outcome === "duplicate_code") {
      return res.status(400).json({ message: `Promo code "${req.body.promo_code}" is already in use.` });
    }

    if (result.outcome === "date_overlap") {
      return res.status(409).json({
        message: "This stall already has another active promotion during that date range. Deactivate it first or choose different dates."
      });
    }

    res.status(200).json(result.promotion);
  } catch (error) {
    console.error("Error updating promotion:", error);

    res.status(500).json({
      message: "Unable to update promotion."
    });
  }
}

module.exports = {
  getPromotionsByStall,
  getPromotion,
  createPromotion,
  updatePromotion
};
