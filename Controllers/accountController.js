const accountModel = require("../Models/accountModel");

async function deactivateOwnAccount(req, res) {
  try {
    // req.user.sub comes from the JWT token.
    // This ensures users can only deactivate their own account.
    const userId = req.user.sub;

    const deactivatedUser = await accountModel.deactivateOwnAccount(userId);

    if (!deactivatedUser) {
      return res.status(404).json({
        message: "Account not found or already deactivated."
      });
    }

    res.status(200).json({
      message: "Account deactivated successfully.",
      user: deactivatedUser
    });
  } catch (error) {
    console.error("Deactivate account error:", error);

    res.status(500).json({
      message: "Unable to deactivate account."
    });
  }
}

module.exports = {
  deactivateOwnAccount
};