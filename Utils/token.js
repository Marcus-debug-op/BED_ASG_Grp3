require("dotenv").config();
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";
const GUEST_JWT_EXPIRES_IN = process.env.GUEST_JWT_EXPIRES_IN || "6h";

// Generates a token for a logged-in, registered user (patron / vendor / officer / operator)
function generateUserToken(user) {
  const payload = {
    sub: user.user_id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    isGuest: false
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Generates a short-lived token for an unregistered guest. sub is null since there is
// no Users row backing a guest session.
function generateGuestToken() {
  const payload = {
    sub: null,
    role: "guest",
    isGuest: true
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: GUEST_JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateUserToken,
  generateGuestToken,
  verifyToken
};
