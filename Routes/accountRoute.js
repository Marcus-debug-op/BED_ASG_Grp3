const express = require("express");
const accountController = require("../Controllers/accountController");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.patch("/deactivate", requireAuth, blockGuests, accountController.deactivateOwnAccount
  /*
    #swagger.tags = ['Account']
    #swagger.description = 'Deactivate the logged-in user account without deleting historical records'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Account deactivated successfully'
    }
    #swagger.responses[401] = {
      description: 'Missing or invalid token'
    }
    #swagger.responses[404] = {
      description: 'Account not found or already deactivated'
    }
  */
);

module.exports = router;