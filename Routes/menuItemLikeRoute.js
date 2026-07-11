const express = require("express");
const likeController = require("../Controllers/likeController");
const { requireAuth } = require("../Middlewares/authMiddleware");

const router = express.Router();

// BED-26: mounted fresh at /api/menu-items in app.js (this domain is
// separate enough from menuItemRoute.js to warrant its own file).
router.post("/:id/likes", requireAuth, likeController.likeItem);
router.delete("/:id/likes", requireAuth, likeController.unlikeItem);
router.get("/:id/likes/count", likeController.getLikeCount); // public, no middleware

module.exports = router;
