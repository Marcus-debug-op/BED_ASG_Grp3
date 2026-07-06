const Joi = require("joi");

function validateMenuItem(req, res, next) {
  const schema = Joi.object({
    item_name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(255).allow("", null),
    price: Joi.number().positive().precision(2).max(9999999.99).required(),
    category: Joi.string().max(50).allow("", null),
    image_url: Joi.string().uri().max(255).allow("", null),
    is_available: Joi.boolean()
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

function validateAvailability(req, res, next) {
  const schema = Joi.object({
    is_available: Joi.boolean().required()
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
  validateMenuItem,
  validateAvailability
};