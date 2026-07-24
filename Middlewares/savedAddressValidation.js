const Joi = require("joi");
 
/*
  Validation for saved addresses (BED-223)
  ----------------------------------------------------------------------------
  This middleware runs BEFORE the controller. If the body is invalid it replies
  with 400 and never reaches the database. This is the backend's own check -
  the checkout page also validates these fields, so there are two layers.
*/
function validateSavedAddress(req, res, next) {
  const schema = Joi.object({
    // The address itself: required, and not just empty spaces.
    address: Joi.string().trim().min(1).max(255).required().messages({
      "string.empty": "Delivery address must be filled.",
      "any.required": "Delivery address is required."
    }),
 
    // Singapore postal codes are exactly 6 digits.
    postal_code: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
      "string.pattern.base": "Postal code must be 6 digits.",
      "any.required": "Postal code is required."
    }),
 
    // Contact details are optional extras saved alongside the address.
    contact_name: Joi.string().trim().max(100).optional().allow(null, ""),
    contact_phone: Joi.string().trim().pattern(/^[689]\d{7}$/).optional().allow(null, "").messages({
      "string.pattern.base": "Phone number must be 8 digits starting with 6, 8 or 9."
    })
  });
 
  // abortEarly: false collects ALL the problems, not just the first one,
  // so the patron can fix everything in one go.
  const validation = schema.validate(req.body, { abortEarly: false });
 
  if (validation.error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: validation.error.details.map((detail) => detail.message)
    });
  }
 
  next();   // all good - hand over to the controller
}
 
module.exports = { validateSavedAddress };