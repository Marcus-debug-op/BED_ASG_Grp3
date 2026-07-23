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
    #swagger.description = 'Step 1 of officer login. Verifies email/password, then sends an OTP and returns a short-lived pendingToken to use with /verify-otp.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        email: 'officer@example.com',
        password: 'Password123!'
      }
    }
    #swagger.responses[200] = {
      description: 'Password verified. OTP sent - use the returned pendingToken with POST /verify-otp.'
    }
    #swagger.responses[400] = {
      description: 'Validation failed'
    }
    #swagger.responses[401] = {
      description: 'Invalid email or password'
    }
  */
);

router.post("/login/operator", validateLogin, authController.loginOperator
      /*
    #swagger.tags = ['Auth']
    #swagger.description = 'Step 1 of operator login. Verifies email/password, then sends an OTP and returns a short-lived pendingToken to use with /verify-otp.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        email: 'operator@example.com',
        password: 'Password123!'
      }
    }
    #swagger.responses[200] = {
      description: 'Password verified. OTP sent - use the returned pendingToken with POST /verify-otp.'
    }
    #swagger.responses[400] = {
      description: 'Validation failed'
    }
    #swagger.responses[401] = {
      description: 'Invalid email or password'
    }
  */
);

// Second step of login for officer/operator - takes the pendingToken issued
// by the /login/officer or /login/operator response above, plus the OTP.
router.post("/verify-otp", authController.verifyOtp
  /*
    #swagger.tags = ['Auth']
    #swagger.description = 'Step 2 of officer/operator login. Verifies the OTP against the pendingToken from step 1, then returns the real login token.'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        pendingToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        otp: '123456'
      }
    }
    #swagger.responses[200] = {
      description: 'Login successful'
    }
    #swagger.responses[400] = {
      description: 'Missing or invalid pendingToken/otp'
    }
    #swagger.responses[401] = {
      description: 'Incorrect or expired OTP, or expired login session'
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