const express = require("express");
const accountController = require("../Controllers/accountController");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();

router.delete("/deactivate", requireAuth, blockGuests, accountController.deactivateOwnAccount
 /*
    #swagger.tags = ['Account']
    #swagger.description = 'Soft deactivate the logged-in patron account without deleting historical records'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = {
      description: 'Account deactivated successfully'
    }
    #swagger.responses[401] = {
      description: 'Missing or invalid token'
    }
    #swagger.responses[403] = {
      description: 'Only patron accounts can use this route'
    }
    #swagger.responses[404] = {
      description: 'Account not found or already deactivated'
    }
  */
);

module.exports = router;