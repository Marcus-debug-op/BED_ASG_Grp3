const bcrypt = require("bcrypt");
const registerModel = require("../Models/registerModel");

async function registerPatron(req, res) {
  try {
    const existingUser = await registerModel.findUserByEmail(req.body.email);

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const rowsAffected = await registerModel.createPatron( {
      full_name: req.body.full_name,
      email: req.body.email,
      password_hash: passwordHash,
      phone_number: req.body.phone_number
    });

 if (!rowsAffected) {
      return res.status(400).json({
        message: "Patron account was not created."
      });
    }


    res.status(201).json({
      message: "Patron account created successfully.",

    });
  } catch (err) {
      console.error("Error creating patron:",err);
      res.status(500).json({
        message: "Unable to register patron account."
      });
  }
}

async function registerVendor(req, res) {
  try {
    const existingUser = await registerModel.findUserByEmail(req.body.email);

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const newVendor = await registerModel.createVendor({
      full_name: req.body.full_name,
      email: req.body.email,
      password_hash: passwordHash,
      phone_number: req.body.phone_number,
      stall_name: req.body.stall_name,
      cuisine_type: req.body.cuisine_type,
      description: req.body.description,
      unit_number: req.body.unit_number,
      hawker_centre_id: req.body.hawker_centre_id,
    });

     if (!newVendor) {
      return res.status(400).json({
        message: "Vendor account was not created."
      });
    }

    res.status(201).json({
      message: "Vendor account and stall created successfully",
      user_id: newVendor.user_id,
      stall_id: newVendor.stall_id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Unable to register vendor account."
    });
  }
}

module.exports = {
  registerPatron,
  registerVendor
};