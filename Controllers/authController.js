const bcrypt = require("bcrypt");
const registerModel = require("../Models/registerModel");
const { generateUserToken, generateGuestToken } = require("../Utils/token");

// Shared login logic for a specific required role ("patron" | "vendor").
async function loginWithRole(req, res, requiredRole) {
  try {
    const { email, password } = req.body;

    const user = await registerModel.findUserAuthByEmail(email);

    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    if (user.role !== requiredRole) {
      return res.status(403).json({
        message: `This account is not registered as a ${requiredRole}.`
      });
    }

    const token = generateUserToken(user);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error(`Error logging in ${requiredRole}:`, err);
    res.status(500).json({
      message: "Unable to process login."
    });
  }
}

async function loginPatron(req, res) {
  return loginWithRole(req, res, "patron");
}

async function loginVendor(req, res) {
  return loginWithRole(req, res, "vendor");
}

// Issues a short-lived guest token so unregistered users can browse public
// resources (stall listings, menus) without creating an account.
async function createGuestSession(req, res) {
  try {
    const token = generateGuestToken();

    res.status(201).json({
      message: "Guest session created.",
      token,
      user: {
        role: "guest",
        isGuest: true
      }
    });
  } catch (err) {
    console.error("Error creating guest session:", err);
    res.status(500).json({
      message: "Unable to create guest session."
    });
  }
}

// Simple endpoint to let the frontend check who the current token belongs to.
// Also useful for verifying that guest tokens are correctly rejected on
// restricted resources when combined with the blockGuests middleware.
async function getCurrentSession(req, res) {
  res.status(200).json({
    user: req.user
  });
}

module.exports = {
  loginPatron,
  loginVendor,
  createGuestSession,
  getCurrentSession
};
