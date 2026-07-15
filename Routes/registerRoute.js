const express = require("express");

const registerController = require("../Controllers/registerController");
const patronValidation = require("../Middlewares/patronValidation");
const vendorValidation = require("../Middlewares/vendorValidation");

const router = express.Router();

router.post("/register/patron", patronValidation, registerController.registerPatron
  /*
    #swagger.tags = ['Auth']
    #swagger.description = 'Register a new patron account'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        full_name: 'Test Patron',
        email: 'testpatron@gmail.com',
        phone_number: '81234567',
        password: 'Testpatron123!', 
        confirm_password: 'Testpatron123!'
      }
    }
  */
);

router.post("/register/vendor", vendorValidation, registerController.registerVendor);

module.exports = router;