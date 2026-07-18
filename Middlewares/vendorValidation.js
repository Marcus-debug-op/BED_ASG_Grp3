const Joi = require("joi");


  const vendorRegisterSchema  = Joi.object({
    full_name: Joi.string().min(2).max(100).required()
    .messages({
      "string.empty": "Full name is required.",
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
    

    stall_name: Joi.string().min(2).max(100).required()
    .messages({
      "string.empty": "Stall name is required.",
      "any.required": "Stall name is required."
    }),

    cuisine_type: Joi.string().max(50).required()
    .messages({
      "string.empty": "Cuisine type is required.",
      "any.required": "Cuisine type is required."
    }),

    description: Joi.string().max(255).required()
    .messages({
      "string.empty": "Stall description is required.",
      "string.min": "Stall description must be at least 5 characters long.",
      "any.required": "Stall description is required."
    }),

    unit_number: Joi.string().max(20).required()
     .messages({
      "string.empty": "Unit number is required.",
      "any.required": "Unit number is required."
    }),

    hawker_centre_id: Joi.number().integer().positive().required()
    .messages({
      "number.base": "Please select a valid hawker centre.",
      "number.positive": "Please select a valid hawker centre.",
      "any.required": "Please select a hawker centre."
    }),

  });


 function validateVendorRegistration(req, res, next) {
  const { error } = vendorRegisterSchema.validate(req.body, {
    abortEarly: true
  });

  if (error) {
    return res.status(400).json({
      message: error.details[0].message
    });
  }

  next();
}

module.exports = validateVendorRegistration;