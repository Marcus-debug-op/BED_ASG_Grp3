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

router.post("/register/vendor", vendorValidation, registerController.registerVendor
/*
    #swagger.tags = ['Auth']
    #swagger.description = 'Register a new vendor account and linked stall'
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        full_name: 'Swagger Test Vendor',
        email: 'swaggervendor123@gmail.com',
        phone_number: '91234567',
        password: 'Testvendor123!',
        confirm_password: 'Testvendor123!',
        stall_name: 'Swagger Chicken Rice',
        cuisine_type: 'Chinese',
        description: 'Test stall created from Swagger',
        unit_number: '#01-99',
        hawker_centre_id: 1
      }
    }
    #swagger.responses[201] = {
      description: 'Vendor account and stall created successfully'
    }
    #swagger.responses[400] = {
      description: 'Validation failed'
    }
    #swagger.responses[409] = {
      description: 'Email is already registered'
    }
  */
);

module.exports = router;