const bcrypt = require("bcrypt");
const passport = require("passport");
const registerModel = require("../Models/registerModel");
const otpStore = require("../Utils/otpStore");
const { generateUserToken, generatePendingToken, generateGuestToken, verifyToken } = require("../Utils/token");

const FRONTEND_APP_URL = process.env.FRONTEND_APP_URL || "index.html";
const FRONTEND_LOGIN_URL = process.env.FRONTEND_LOGIN_URL || "/auth/SigninPatron.html";

// Roles that must pass an OTP step after their password is verified,
// before a real (usable) token is issued.
const MFA_ROLES = ["officer", "operator"];

// Shared login logic for a specific required role ("patron" | "vendor" | "officer" | "operator").
async function loginWithRole(req, res, requiredRole) {
  try {
    const { email, password, badgeId } = req.body;

    console.log("Email received:", email);

    const user = await registerModel.findUserAuthByEmail(email);

    console.log("User:", user);
    if (!user) {
      return res.status(401).json({
        message: "Incorrect email or password."
      });
    }

    if (user.is_active === false || user.is_active === 0) {
      return res.status(403).json({
        message: "This account has been deactivated."
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

    // Officers and operators must additionally confirm their badge ID
    // matches what's on file - an extra identity check on top of
    // email/password, specific to these two enforcement/oversight roles.
    if (requiredRole === "officer" || requiredRole === "operator") {
      if (!badgeId) {
        return res.status(400).json({
          message: "Badge ID is required."
        });
      }

      const badgeMatches = badgeId.trim() === (user.badge_id || "").trim();

      if (!badgeMatches) {
        return res.status(401).json({
          message: "Badge ID does not match our records."
        });
      }
    }

    // Officer/operator accounts require OTP verification before a usable
    // token is issued - password alone only proves step 1 of login.
    if (MFA_ROLES.includes(user.role)) {
      const otp = otpStore.saveOtp(user.user_id);
      const pendingToken = generatePendingToken(user);

      // TODO (production): send `otp` to user.email via a real mailer
      // instead of/in addition to this.
      console.log(`[DEV] OTP for ${user.email} (${user.role}): ${otp}`);

      const response = {
        message: "Password verified. Enter the OTP sent to your email to finish signing in.",
        mfaRequired: true,
        pendingToken
      };

      // Dev-only convenience so this can be demoed without a real mailbox.
      // Never do this in production - it defeats the purpose of the OTP.
      if (process.env.NODE_ENV !== "production") {
        response.devOtp = otp;
      }

      return res.status(200).json(response);
    }

    const token = generateUserToken(user);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        badge_id: user.badge_id
      }
    });
  } catch (err) {
    console.error(`Error logging in ${requiredRole}:`, err);
    res.status(500).json({
      message: "Unable to process login."
    });
  }
}

// POST /api/auth/verify-otp - second step of login for officer/operator.
// Takes the pendingToken issued by loginWithRole plus the OTP the user entered.
async function verifyOtp(req, res) {
  try {
    const { pendingToken, otp } = req.body;

    if (!pendingToken || !otp) {
      return res.status(400).json({ message: "pendingToken and otp are required." });
    }

    let decoded;
    try {
      decoded = verifyToken(pendingToken);
    } catch (error) {
      return res.status(401).json({ message: "Login session expired. Please log in again." });
    }

    if (!decoded.mfaPending) {
      return res.status(400).json({ message: "Invalid login session." });
    }

    const result = otpStore.verifyOtp(decoded.sub, otp);

    if (result.outcome === "expired") {
      return res.status(401).json({ message: "OTP has expired. Please log in again." });
    }
    if (result.outcome === "not_found") {
      return res.status(401).json({ message: "No OTP pending for this session. Please log in again." });
    }
    if (result.outcome === "incorrect") {
      return res.status(401).json({ message: "Incorrect OTP." });
    }

    // OTP verified - now issue the real, usable token.
    const user = await registerModel.findUserAuthByEmail(decoded.email);
    if (!user) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    const token = generateUserToken(user);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        badge_id: user.badge_id
      }
    });
  } catch (err) {
    console.error("Error verifying OTP:", err);
    res.status(500).json({ message: "Unable to verify OTP." });
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
  verifyOtp,
  createGuestSession,
  getCurrentSession,
  googleAuthCallback
};