const express = require("express");
const likeController = require("../Controllers/likeController");
const { blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();

// BED-26: mounted fresh at /api/menu-items in app.js (this domain is
// separate enough from menuItemRoute.js to warrant its own file).
// blockGuests instead of requireAuth - guests hold a valid token too, so
// requireAuth alone would let them like/unlike items. Only registered
// patrons may like menu items.
router.post("/:id/likes", blockGuests, likeController.likeItem
  /*
    #swagger.tags = ['Patron - Likes']
    #swagger.description = 'BED-26: Like a menu item. Registered patrons only - guests are rejected.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);
router.delete("/:id/likes", blockGuests, likeController.unlikeItem
  /*
    #swagger.tags = ['Patron - Likes']
    #swagger.description = 'BED-26: Remove your like from a menu item.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);
router.get("/:id/likes/count", likeController.getLikeCount
  /*
    #swagger.tags = ['Patron - Likes']
    #swagger.description = 'BED-26: Get the total like count for a menu item. Public - no auth required.'
  */
); // public, no middleware

module.exports = router;
