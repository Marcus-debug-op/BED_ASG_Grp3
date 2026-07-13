const Joi = require("joi");

function validatePromotion(req, res, next) {
  const schema = Joi.object({
    promo_code: Joi.string().trim().uppercase().min(2).max(50).required(),
    description: Joi.string().max(255).allow("", null),
    discount_percent: Joi.number().positive().max(100).precision(2).required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref("start_date")).required(),
    is_active: Joi.boolean()
  });

  const validation = schema.validate(req.body, {
    abortEarly: false
  });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  // Joi's uppercase/trim transforms don't mutate req.body by default; apply the cleaned value.
  req.body = validation.value;

  next();
}

function validatePromotionActive(req, res, next) {
  const schema = Joi.object({
    is_active: Joi.boolean().required()
  });

  const validation = schema.validate(req.body, {
    abortEarly: false
  });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  next();
}

module.exports = {
  validatePromotion,
  validatePromotionActive
};
