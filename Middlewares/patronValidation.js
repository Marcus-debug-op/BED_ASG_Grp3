const Joi = require("joi");


  const patronRegisterSchema = Joi.object({
    full_name: Joi.string().min(2).max(100).required()
    .messages({
      "string.empty": "Full name is required.",
      "string.min": "Full name must be at least 2 characters long.",
      "any.required": "Full name is required."
    }),

    email: Joi.string().email().max(100).required()
     .messages({
      "string.email": "Please enter a valid email address.",
      "string.empty": "Email address is required.",
      "any.required": "Email address is required."
    }),

    password: Joi.string().min(8).max(50).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/).required()
    .messages({
      "string.min": "Password must be at least 8 characters long.",
      "string.pattern.base": "Password must include uppercase, lowercase, number, and special character.",
      "string.empty": "Password is required.",
      "any.required": "Password is required."
    }),
    
    confirm_password: Joi.string().valid(Joi.ref("password")).required()
    .messages({
      "any.only": "Password and confirm password do not match.",
      "string.empty": "Confirm password is required.",
      "any.required": "Confirm password is required."
    }),

    phone_number: Joi.string().pattern(/^[689]\d{7}$/).required()
    
    .messages({
      "string.pattern.base": "Phone number must be 8 digits and start with 6, 8, or 9.",
      "string.empty": "Phone number is required.",
      "any.required": "Phone number is required."
    }),

    });
  

function validatePatronRegister(req, res, next) {
  const { error } = patronRegisterSchema.validate(req.body, {
    abortEarly: false
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed.",
      errors: error.details.map((detail) => detail.message)
    });
  }

  next();
}

module.exports = validatePatronRegister;