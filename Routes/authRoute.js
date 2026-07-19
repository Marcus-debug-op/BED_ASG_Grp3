const express = require("express");
const passport = require("passport");

const authController = require("../Controllers/authController");
const validateLogin = require("../Middlewares/loginValidation");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.post("/login/patron", validateLogin, authController.loginPatron
/*
    #swagger.tags = ['Auth']
    #swagger.description = 'Login as a patron account'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        email: 'marcusisapatron@gmail.com',
        password: 'Password123!'
      }
    }
    #swagger.responses[200] = {
      description: 'Login successful'
    }
    #swagger.responses[400] = {
      description: 'Validation failed'
    }
    #swagger.responses[401] = {
      description: 'Invalid email or password'
    }
  */
);

router.post("/login/vendor", validateLogin, authController.loginVendor
    /*
    #swagger.tags = ['Auth']
    #swagger.description = 'Login as a vendor account'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        email: 'marcusisavendor@gmail.com',
        password: 'Password123!'
      }
    }
    #swagger.responses[200] = {
      description: 'Login successful'
    }
    #swagger.responses[400] = {
      description: 'Validation failed'
    }
    #swagger.responses[401] = {
      description: 'Invalid email or password'
    }
  */
);

router.post("/login/officer", validateLogin, authController.loginOfficer
     /*
    #swagger.tags = ['Auth']
    #swagger.description = 'Login as an officer account'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        email: 'officer@example.com',
        password: 'Password123!'
      }
    }
  */
);

router.post("/login/operator", validateLogin, authController.loginOperator
      /*
    #swagger.tags = ['Auth']
    #swagger.description = 'Login as an operator account'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        email: 'operator@example.com',
        password: 'Password123!'
      }
    }
  */
);

// Google OAuth 2.0 sign-in/sign-up for patrons (BED-144), via Passport's Google strategy.
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/google/callback", authController.googleAuthCallback);

// Guest session - no credentials required.
router.post("/guest", authController.createGuestSession);

// Example of a protected, non-guest-accessible route (e.g. profile / order history
// style endpoints should use blockGuests the same way).
router.get("/me", requireAuth, blockGuests, authController.getCurrentSession);

module.exports = router;