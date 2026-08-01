const Joi = require("joi");

// BED-145: validate the assign-vendor request body.
function validateAssignVendor(req, res, next) {
  const schema = Joi.object({
    stall_id: Joi.number().integer().positive().required().messages({
      "any.required": "stall_id is required.",
      "number.base": "stall_id must be a number."
    }),
    vendor_id: Joi.number().integer().positive().required().messages({
      "any.required": "vendor_id is required.",
      "number.base": "vendor_id must be a number."
    }),
    // Optional explicit opt-in to reassign an already-occupied stall.
    reassign: Joi.boolean().default(false)
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

module.exports = { validateAssignVendor };