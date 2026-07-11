const menuItemLikeModel = require("../Models/menuItemLikeModel");

// BED-26: POST /api/menu-items/:id/likes
async function likeItem(req, res) {
  try {
    const userId = req.user.sub;
    const menuItemId = Number(req.params.id);

    const updated = await menuItemLikeModel.likeItem(userId, menuItemId);

    res.status(201).json({
      message: "Item liked.",
      menu_item_id: updated.menu_item_id,
      likes: updated.likes
    });
  } catch (error) {
    console.error("Error liking item:", error);

    // SQL Server PK violation - this (user_id, menu_item_id) pair already exists,
    // i.e. the user already liked this item. Friendly 200, not a raw 500.
    if (error.number === 2627) {
      return res.status(200).json({
        message: "Already liked."
      });
    }

    // SQL Server FK violation - menu_item_id doesn't exist.
    if (error.number === 547) {
      return res.status(404).json({
        message: "Menu item not found."
      });
    }

    res.status(500).json({
      message: "Unable to like item."
    });
  }
}

// BED-26: DELETE /api/menu-items/:id/likes
async function unlikeItem(req, res) {
  try {
    const userId = req.user.sub;
    const menuItemId = Number(req.params.id);

    const updated = await menuItemLikeModel.unlikeItem(userId, menuItemId);

    if (!updated) {
      return res.status(404).json({
        message: "Like not found."
      });
    }

    res.status(200).json({
      message: "Item unliked.",
      menu_item_id: updated.menu_item_id,
      likes: updated.likes
    });
  } catch (error) {
    console.error("Error unliking item:", error);

    res.status(500).json({
      message: "Unable to unlike item."
    });
  }
}

// BED-26: GET /api/menu-items/:id/likes/count - public, no middleware.
async function getLikeCount(req, res) {
  try {
    const menuItemId = Number(req.params.id);

    const result = await menuItemLikeModel.getLikeCount(menuItemId);

    if (!result) {
      return res.status(404).json({
        message: "Menu item not found."
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error getting like count:", error);

    res.status(500).json({
      message: "Unable to load like count."
    });
  }
}

module.exports = {
  likeItem,
  unlikeItem,
  getLikeCount
};
