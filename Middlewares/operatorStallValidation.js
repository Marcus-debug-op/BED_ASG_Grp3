const Joi = require("joi");

function validateCreateStall(req, res, next) {
  const schema = Joi.object({
    vendor_id: Joi.number().integer().positive().required().messages({
      "any.required": "vendor_id is required.",
      "number.base": "vendor_id must be a number."
    }),

    stall_name: Joi.string().min(2).max(100).required().messages({
      "string.empty": "Stall name is required.",
      "any.required": "Stall name is required."
    }),

    hawker_centre_id: Joi.number().integer().positive().required().messages({
      "any.required": "hawker_centre_id is required.",
      "number.base": "hawker_centre_id must be a number."
    }),

    description: Joi.string().max(255).allow("", null),
    unit_number: Joi.string().max(20).allow("", null),
    operating_hours: Joi.string().max(50).allow("", null),
    price_range: Joi.string().max(20).allow("", null),
    phone_number: Joi.string().max(20).allow("", null),
    image_url: Joi.string().uri().max(255).allow("", null)
  });

  const validation = schema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  req.body = validation.value;
  next();
}

function validateUpdateStall(req, res, next) {
  // Same shape as create - operator supplies the full record on update.
  const schema = Joi.object({
    vendor_id: Joi.number().integer().positive().required(),
    stall_name: Joi.string().min(2).max(100).required(),
    hawker_centre_id: Joi.number().integer().positive().required(),
    description: Joi.string().max(255).allow("", null),
    unit_number: Joi.string().max(20).allow("", null),
    operating_hours: Joi.string().max(50).allow("", null),
    price_range: Joi.string().max(20).allow("", null),
    phone_number: Joi.string().max(20).allow("", null),
    image_url: Joi.string().uri().max(255).allow("", null)
  });

  const validation = schema.validate(req.body, { abortEarly: false });

  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }

  req.body = validation.value;
  next();
}

module.exports = { validateCreateStall, validateUpdateStall };
