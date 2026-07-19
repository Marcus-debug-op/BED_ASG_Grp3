const Joi = require("joi");

function validatePromotion(req, res, next) {
  const schema = Joi.object({
    promo_code: Joi.string().trim().min(3).max(50).required(),
    description: Joi.string().max(255).allow("", null),
    discount_percent: Joi.number().positive().max(100).precision(2).required(),
    start_date: Joi.date().iso().required(),
    end_date: Joi.date().iso().min(Joi.ref("start_date")).required().messages({
      "date.min": '"end_date" must be on or after "start_date"'
    }),
    is_active: Joi.boolean(),
    // Optional - leave blank/null for "no minimum spend" / "unlimited redemptions".
    min_spend_amount: Joi.number().positive().precision(2).allow(null, ""),
    max_redemptions: Joi.number().integer().positive().allow(null, "")
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
  validatePromotion
};