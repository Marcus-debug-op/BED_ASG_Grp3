const Joi = require("joi");

function validateOrder(req, res, next) {
  const schema = Joi.object({
    stall_id: Joi.number().integer().positive().required(),
    items: Joi.array().min(1).items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required()
      })
    ).required(),
    // Added for promotion application/redemption (damien) - optional, so
    // existing checkout calls without a promo code are unaffected.
    promo_code: Joi.string().trim().max(50).optional()
  });

  const validation = schema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  next();
}

// BED-92: same shape as validateOrder, but promo_code is required here -
// there's no reason to call the preview endpoint without one.
function validatePromoPreview(req, res, next) {
  const schema = Joi.object({
    stall_id: Joi.number().integer().positive().required(),
    items: Joi.array().min(1).items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required()
      })
    ).required(),
    promo_code: Joi.string().trim().min(1).max(50).required()
  });

  const validation = schema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  next();
}

function validateOrderStatus(req, res, next) {
  const schema = Joi.object({
    order_status: Joi.string()
      .valid("Pending", "Preparing", "Ready", "Completed", "Cancelled")
      .required()
  });

  const validation = schema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  next();
}

module.exports = { validateOrder, validatePromoPreview, validateOrderStatus };