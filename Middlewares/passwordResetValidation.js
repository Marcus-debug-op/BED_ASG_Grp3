const Joi = require("joi");

function validateForgotPassword(req, res, next) {
  const schema = Joi.object({
    email: Joi.string().email().max(100).required().messages({
      "string.email": "Please enter a valid email address.",
      "string.empty": "Email address is required.",
      "any.required": "Email address is required."
    })
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

function validateResetPassword(req, res, next) {
  const schema = Joi.object({
    token: Joi.string().required().messages({
      "string.empty": "Reset token is required.",
      "any.required": "Reset token is required."
    }),

    newPassword: Joi.string()
      .min(8)
      .max(50)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
      .required()
      .messages({
        "string.min": "Password must be at least 8 characters long.",
        "string.pattern.base": "Password must include uppercase, lowercase, number, and special character.",
        "string.empty": "New password is required.",
        "any.required": "New password is required."
      })
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

module.exports = { validateForgotPassword, validateResetPassword };
