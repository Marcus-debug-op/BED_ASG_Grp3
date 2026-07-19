const bcrypt = require("bcrypt");
const registerModel = require("../Models/registerModel");


// POST /api/auth/register/patron
// This function handles patron registration.
// It checks whether the email already exists, hashes the password,
// then creates a new patron account in the Users table.
async function registerPatron(req, res) {
  try {
    // Check whether the email is already used by another account.
    // This prevents duplicate accounts with the same email.
    const existingUser = await registerModel.findUserByEmail(req.body.email);

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    // Hash the password before storing it in the database.
    // The number 10 is the salt rounds used by bcrypt.
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    // Create the patron account using the validated request data.
    // The role is handled inside the model as "patron".
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

// POST /api/auth/register/vendor
// This function handles vendor registration.
// Vendor registration creates both:
// 1. A vendor user account in the Users table.
// 2. A linked stall record in the Stalls table.
async function registerVendor(req, res) {
  try {
    // Check whether the email is already registered.
    // Vendors cannot reuse an email that already belongs to another user.
    const existingUser = await registerModel.findUserByEmail(req.body.email);

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered."
      });
    }

    // Hash the vendor's password before saving it.
    // This prevents plain-text passwords from being stored in the database.
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    // Create the vendor account and linked stall record.
    // The model uses a transaction so both inserts succeed or fail together.
    const newVendor = await registerModel.createVendor({
      full_name: req.body.full_name,
      email: req.body.email,
      password_hash: passwordHash,
      phone_number: req.body.phone_number,

      // Stall details used to create the vendor's stall record.
      stall_name: req.body.stall_name,
      cuisine_type: req.body.cuisine_type,
      description: req.body.description,
      unit_number: req.body.unit_number,
      hawker_centre_id: req.body.hawker_centre_id,
    });

     // If the model does not return the created vendor/stall IDs,
    // treat it as a failed vendor registration.
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