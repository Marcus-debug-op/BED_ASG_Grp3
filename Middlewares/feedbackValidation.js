const Joi = require("joi");

// Shared schema for both POST (BED-2) and PUT (BED-92) - exported so
// feedbackRoute.js / other controllers don't have to duplicate the rules.
const feedbackSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().max(500).allow("", null),
  stall_id: Joi.number().integer().positive().required()
});

function validateFeedback(req, res, next) {
  const validation = feedbackSchema.validate(req.body, {
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
  feedbackSchema,
  validateFeedback
};
