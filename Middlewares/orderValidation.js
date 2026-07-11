const Joi = require("joi");

function validateOrder(req, res, next) {
  const schema = Joi.object({
    stall_id: Joi.number().integer().positive().required(),
    items: Joi.array().min(1).items(
      Joi.object({
        menu_item_id: Joi.number().integer().positive().required(),
        quantity: Joi.number().integer().positive().required()
      })
    ).required()
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

function validateOrderStatus(req, res, next) {
  const schema = Joi.object({
    order_status: Joi.string()
      .valid("Pending", "Preparing", "Ready", "Completed", "Cancelled")
      .required()
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

module.exports = { validateOrder, validateOrderStatus };