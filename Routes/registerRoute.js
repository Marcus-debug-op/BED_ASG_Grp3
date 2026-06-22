const express = require("express");

const registerController = require("../Controllers/registerController");
const patronValidation = require("../Middlewares/patronValidation");
const vendorValidation = require("../Middlewares/vendorValidation");

const router = express.Router();

router.post("/register/patron", patronValidation, registerController.registerPatron);
router.post("/register/vendor", vendorValidation, registerController.registerVendor);

module.exports = router;