const Joi = require("joi");

function validatePatronRegister(req, res, next) {
  const schema = Joi.object({
    full_name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().max(100).required(),
    password: Joi.string().min(8).max(50).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/).required()
    .messages({
      "string.min": "Password must be at least 8 characters long.",
      "string.pattern.base": "Password must include uppercase, lowercase, number, and special character."
    }),
    
    confirm_password: Joi.string().valid(Joi.ref("password")).required()
      .messages({
        "any.only": "Passwords do not match."
      }),
    phone_number: Joi.string().max(20).allow("", null)
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

module.exports = validatePatronRegister;