const express = require("express");
const passport = require("passport");

const authController = require("../Controllers/authController");
const validateLogin = require("../Middlewares/loginValidation");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.post("/login/patron", validateLogin, authController.loginPatron);
router.post("/login/vendor", validateLogin, authController.loginVendor);
router.post("/login/officer", validateLogin, authController.loginOfficer);
router.post("/login/operator", validateLogin, authController.loginOperator);

// Google OAuth 2.0 sign-in/sign-up for patrons (BED-144), via Passport's Google strategy.
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", authController.googleAuthCallback);

// Guest session - no credentials required.
router.post("/guest", authController.createGuestSession);

// Example of a protected, non-guest-accessible route (e.g. profile / order history
// style endpoints should use blockGuests the same way).
router.get("/me", requireAuth, blockGuests, authController.getCurrentSession);

module.exports = router;