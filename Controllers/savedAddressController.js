const savedAddressModel = require("../Models/savedAddressModel");
 
/*
  SavedAddresses controller (BED-223)
  ----------------------------------------------------------------------------
  The controller sits between the route and the model. Its jobs are:
    1. Work out WHO is asking (from the login token, never the request body).
    2. Ask the model to do the database work.
    3. Decide which HTTP status code to send back.
 
  Every function reads the patron id the same way:
      const patronId = req.user.sub;
  req.user is set by the auth middleware after it verifies the JWT, so this
  value cannot be faked by the client.
*/
 
// ---------------------------------------------------------------------------
// POST /api/addresses  -> CREATE
// ---------------------------------------------------------------------------
async function createAddress(req, res) {
  try {
    const patronId = req.user.sub;
    const { address, postal_code, contact_name, contact_phone } = req.body;
 
    const newAddress = await savedAddressModel.createAddress(
      patronId, address, postal_code, contact_name, contact_phone
    );
 
    // 201 Created is the correct status when a new resource is made.
    res.status(201).json({ message: "Address saved.", address: newAddress });
  } catch (error) {
    console.error("Error saving address:", error);
    res.status(500).json({ message: "Unable to save address." });
  }
}
 
// ---------------------------------------------------------------------------
// GET /api/addresses  -> READ (list all of this patron's addresses)
// ---------------------------------------------------------------------------
async function getMyAddresses(req, res) {
  try {
    const patronId = req.user.sub;
 
    const addresses = await savedAddressModel.getAddressesByPatron(patronId);
 
    // An empty list is a valid result, not an error - a patron may simply not
    // have saved any addresses yet.
    res.status(200).json({ addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ message: "Unable to fetch addresses." });
  }
}
 
// ---------------------------------------------------------------------------
// PUT /api/addresses/:id  -> UPDATE
// ---------------------------------------------------------------------------
async function updateAddress(req, res) {
  try {
    const patronId = req.user.sub;
    const addressId = Number(req.params.id);
 
    // Guard against a non-numeric id like /api/addresses/abc
    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({ message: "Invalid address id." });
    }
 
    const { address, postal_code, contact_name, contact_phone } = req.body;
 
    const updated = await savedAddressModel.updateAddress(
      addressId, patronId, address, postal_code, contact_name, contact_phone
    );
 
    // null means no row matched BOTH the id and this patron - so either it
    // doesn't exist, or it isn't theirs. Either way: 404, which also avoids
    // telling an attacker that someone else's address exists.
    if (!updated) {
      return res.status(404).json({ message: "Address not found." });
    }
 
    res.status(200).json({ message: "Address updated.", address: updated });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ message: "Unable to update address." });
  }
}
 
// ---------------------------------------------------------------------------
// DELETE /api/addresses/:id  -> DELETE
// ---------------------------------------------------------------------------
async function deleteAddress(req, res) {
  try {
    const patronId = req.user.sub;
    const addressId = Number(req.params.id);
 
    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({ message: "Invalid address id." });
    }
 
    const deleted = await savedAddressModel.deleteAddress(addressId, patronId);
 
    // false means nothing was deleted (wrong id, or not this patron's).
    if (!deleted) {
      return res.status(404).json({ message: "Address not found." });
    }
 
    res.status(200).json({ message: "Address deleted." });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ message: "Unable to delete address." });
  }
}
 
module.exports = {
  createAddress,
  getMyAddresses,
  updateAddress,
  deleteAddress
};