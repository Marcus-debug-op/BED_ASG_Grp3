const express = require("express");
const router = express.Router();
 
const savedAddressController = require("../Controllers/savedAddressController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateSavedAddress } = require("../Middlewares/savedAddressValidation");
 
/*
  SavedAddresses routes (BED-223)
  ----------------------------------------------------------------------------
  Mounted at /api/addresses in app.js, so the paths below are relative to that.
 
  This is the patron side's full CRUD resource:
    POST   /api/addresses      -> Create
    GET    /api/addresses      -> Read
    PUT    /api/addresses/:id  -> Update
    DELETE /api/addresses/:id  -> Delete
 
  Every route is guarded by requireRole("patron"), so:
    - no token          -> 401 Unauthorized
    - a vendor's token  -> 403 Forbidden
*/
 
// CREATE - save a new address. validateSavedAddress checks the body first.
router.post("/", requireRole("patron"), validateSavedAddress, savedAddressController.createAddress
/*
    #swagger.tags = ['Patron - Addresses']
    #swagger.description = "Patron saves a new delivery address"
    #swagger.security = [{ "bearerAuth": [] }]
  */);
 
// READ - list all of the logged-in patron's saved addresses.
router.get("/", requireRole("patron"), savedAddressController.getMyAddresses
/*
    #swagger.tags = ['Patron - Addresses']
    #swagger.description = "Patron retrieves all of their saved delivery addresses"
    #swagger.security = [{ "bearerAuth": [] }]
  */);
 
// UPDATE - edit one saved address by its id.
router.put("/:id", requireRole("patron"), validateSavedAddress, savedAddressController.updateAddress
/*
    #swagger.tags = ['Patron - Addresses']
    #swagger.description = "Patron updates one of their saved delivery addresses"
    #swagger.security = [{ "bearerAuth": [] }]
  */);
 
// DELETE - remove one saved address by its id.
router.delete("/:id", requireRole("patron"), savedAddressController.deleteAddress
/*
    #swagger.tags = ['Patron - Addresses']
    #swagger.description = "Patron deletes one of their saved delivery addresses"
    #swagger.security = [{ "bearerAuth": [] }]
  */);
 
module.exports = router;