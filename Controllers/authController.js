const bcrypt = require("bcrypt");
const passport = require("passport");
const registerModel = require("../Models/registerModel");
const { generateUserToken, generateGuestToken } = require("../Utils/token");

const FRONTEND_APP_URL = process.env.FRONTEND_APP_URL || "index.html";
const FRONTEND_LOGIN_URL = process.env.FRONTEND_LOGIN_URL || "/auth/SigninPatron.html";

// Shared login logic for a specific required role ("patron" | "vendor").
async function loginWithRole(req, res, requiredRole) {
  try {
    const { email, password } = req.body;

    console.log("Email received:", email);

    const user = await registerModel.findUserAuthByEmail(email);

    console.log("User:", user);
    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    console.log("Password match:", passwordMatches);

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

async function loginOfficer(req, res) {
  return loginWithRole(req, res, "officer");
}

async function loginOperator(req, res) {
  return loginWithRole(req, res, "operator");
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

// GET /api/auth/google/callback -> Google redirects here after consent. Passport's Google
// strategy (config/passport.js) does the token exchange + profile fetch + DB find-or-create;
// this handler just decides what to do with the result (issue our JWT, or redirect on failure).
function googleAuthCallback(req, res, next) {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Error during Google auth callback:", err);
      return res.redirect(`${FRONTEND_LOGIN_URL}?error=google_auth_failed`);
    }

    if (!user) {
      const reason = info?.reason || "google_auth_failed";
      return res.redirect(`${FRONTEND_LOGIN_URL}?error=${reason}`);
    }

    const token = generateUserToken(user);
    return res.redirect(`${FRONTEND_APP_URL}?token=${encodeURIComponent(token)}`);
  })(req, res, next);
}

module.exports = {
  loginPatron,
  loginVendor,
  loginOfficer,
  loginOperator,
  createGuestSession,
  getCurrentSession,
  googleAuthCallback
};