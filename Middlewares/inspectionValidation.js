const Joi = require("joi");

const scheduleInspectionSchema = Joi.object({
  stall_id: Joi.number().integer().positive().required().messages({
    "number.base": "Please provide a valid stall ID.",
    "number.integer": "Stall ID must be a whole number.",
    "number.positive": "Stall ID must be positive.",
    "any.required": "Stall ID is required."
  }),

  inspection_date: Joi.date().iso().greater("now").required().messages({
    "date.base": "Please provide a valid inspection date.",
    "date.format": "Inspection date must be in ISO format.",
    "date.greater": "Inspection date must be in the future.",
    "any.required": "Inspection date is required."
  })
});

function validateScheduleInspection(req, res, next) {
  const { error } = scheduleInspectionSchema.validate(req.body, {
    abortEarly: true
  });

  if (error) {
    return res.status(400).json({
      message: error.details[0].message
    });
  }

  next();
}

module.exports = {
  validateScheduleInspection
};