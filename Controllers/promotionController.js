const promotionModel = require("../Models/promotionModel");

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

async function createPromotion(req, res) {
  try {
    const vendorId = req.user.sub;
    const stallId = Number(req.params.stallId);

    const created = await promotionModel.createPromotion(stallId, vendorId, req.body);

    if (created === null) {
      return res.status(403).json({
        message: "You do not own this stall."
      });
    }

    if (created.error === "DUPLICATE_CODE") {
      return res.status(409).json({
        message: "This promo code is already in use."
      });
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating promotion:", error);

    res.status(500).json({
      message: "Unable to create promotion."
    });
  }
}

async function updatePromotion(req, res) {
  try {
    const vendorId = req.user.sub;
    const promotionId = Number(req.params.promotionId);

    const updated = await promotionModel.updatePromotion(promotionId, vendorId, req.body);

    if (updated && updated.error === "DUPLICATE_CODE") {
      return res.status(409).json({
        message: "This promo code is already in use."
      });
    }

    if (!updated) {
      return res.status(404).json({
        message: "Promotion not found."
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating promotion:", error);

    res.status(500).json({
      message: "Unable to update promotion."
    });
  }
}

async function setActive(req, res) {
  try {
    const vendorId = req.user.sub;
    const promotionId = Number(req.params.promotionId);
    const { is_active } = req.body;

    const updated = await promotionModel.setPromotionActive(promotionId, vendorId, is_active);

    if (!updated) {
      return res.status(404).json({
        message: "Promotion not found."
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating promotion status:", error);

    res.status(500).json({
      message: "Unable to update promotion status."
    });
  }
}

async function deletePromotion(req, res) {
  try {
    const vendorId = req.user.sub;
    const promotionId = Number(req.params.promotionId);

    const deleted = await promotionModel.deletePromotion(promotionId, vendorId);

    if (!deleted) {
      return res.status(404).json({
        message: "Promotion not found."
      });
    }

    res.status(200).json({
      message: "Promotion deleted."
    });
  } catch (error) {
    console.error("Error deleting promotion:", error);

    if (error.number === 547) {
      return res.status(409).json({
        message: "This promotion is linked to past orders and cannot be deleted. Set it inactive instead."
      });
    }

    res.status(500).json({
      message: "Unable to delete promotion."
    });
  }
}

module.exports = {
  getPromotionsByStall,
  createPromotion,
  updatePromotion,
  setActive,
  deletePromotion
};
