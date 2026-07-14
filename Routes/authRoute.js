const express = require("express");

const authController = require("../Controllers/authController");
const validateLogin = require("../Middlewares/loginValidation");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.post("/login/patron", validateLogin, authController.loginPatron);
router.post("/login/vendor", validateLogin, authController.loginVendor);
router.post("/login/officer", validateLogin, authController.loginOfficer);
router.post("/login/operator", validateLogin, authController.loginOperator);

// Guest session - no credentials required.
router.post("/guest", authController.createGuestSession);

// Example of a protected, non-guest-accessible route (e.g. profile / order history
// style endpoints should use blockGuests the same way).
router.get("/me", requireAuth, blockGuests, authController.getCurrentSession);

module.exports = router;