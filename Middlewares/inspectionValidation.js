const Joi = require("joi");


// Scheduling requires both stall_id and inspection_date because a new inspection is created.
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

// Rescheduling only needs a new inspection_date because the inspection already exists.
const rescheduleInspectionSchema = Joi.object({
  inspection_date: Joi.date().iso().greater("now").required().messages({
    "date.base": "Please provide a valid inspection date.",
    "date.format": "Inspection date must be in ISO format.",
    "date.greater": "Inspection date must be in the future.",
    "any.required": "Inspection date is required."
  })
});

// Completing an inspection requires score, result, and a valid hygiene grade.
const completeInspectionSchema = Joi.object({
  score: Joi.number().integer().min(0).max(100).required().messages({
    "number.base": "Score must be a number.",
    "number.integer": "Score must be a whole number.",
    "number.min": "Score must be between 0 and 100.",
    "number.max": "Score must be between 0 and 100.",
    "any.required": "Score is required."
  }),

  hygiene_grade: Joi.string().valid("A", "B", "C", "D").required().messages({
    "any.only": "Hygiene grade must be A, B, C, or D.",
    "string.empty": "Hygiene grade is required.",
    "any.required": "Hygiene grade is required."
  }),

  remarks: Joi.string().max(500).allow("", null),

  result: Joi.string().valid("Pass", "Fail", "Needs Follow-up").required().messages({
    "any.only": "Result must be Pass, Fail, or Needs Follow-up.",
    "string.empty": "Result is required.",
    "any.required": "Result is required."
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

function validateRescheduleInspection(req, res, next) {
  const { error } = rescheduleInspectionSchema.validate(req.body, {
    abortEarly: true
  });

  if (error) {
    return res.status(400).json({
      message: error.details[0].message
    });
  }

  next();
}

function validateCompleteInspection(req, res, next) {
  const { error } = completeInspectionSchema.validate(req.body, {
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
  validateScheduleInspection,
  validateRescheduleInspection,
  validateCompleteInspection,
};