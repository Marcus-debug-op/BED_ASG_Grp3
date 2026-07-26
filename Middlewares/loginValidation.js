const Joi = require("joi");

function validateLogin(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().email().max(100).required(),
    password: Joi.string().min(1).max(50).required(),
    badgeId: Joi.string().max(20).optional()
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

module.exports = validateLogin;