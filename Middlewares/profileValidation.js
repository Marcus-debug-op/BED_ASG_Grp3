function validateUpdateProfile(req, res, next) {
  const { full_name, phone_number } = req.body;

  if (!full_name || !phone_number) {
    return res.status(400).json({
      message: "Full name and phone number are required."
    });
  }

  if (!/^\d+$/.test(phone_number)) {
    return res.status(400).json({
      message: "Phone number must contain numbers only."
    });
  }

  if (!/^[689]\d{7}$/.test(phone_number)) {
    return res.status(400).json({
      message: "Phone number must be 8 digits and start with 6, 8, or 9."
    });
  }

  next();
}

module.exports = {
  validateUpdateProfile,
};