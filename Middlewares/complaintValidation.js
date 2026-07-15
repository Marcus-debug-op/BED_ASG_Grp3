const Joi = require("joi");
const { VALID_STATUSES } = require("../Models/complaintModel");

function validateStatusUpdate(req, res, next) {
  const schema = Joi.object({
    status: Joi.string().valid(...VALID_STATUSES).required(),
    note: Joi.string().max(500).allow("", null)
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

const COMPLAINT_TYPES = ["Hygiene", "Service", "Food Quality", "Overcharging", "Other"];

function validateComplaintSubmission(req, res, next) {
  const schema = Joi.object({
    stall_id: Joi.number().integer().positive().required(),
    complaint_type: Joi.string().valid(...COMPLAINT_TYPES).required(),
    description: Joi.string().min(10).max(500).required()
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

module.exports = {
  validateStatusUpdate,
  validateComplaintSubmission
};