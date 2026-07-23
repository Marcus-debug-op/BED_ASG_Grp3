const crypto = require("crypto");
const bcrypt = require("bcrypt");
const registerModel = require("../Models/registerModel");
const passwordResetModel = require("../Models/passwordResetModel");
const emailService = require("../Utils/emailService");

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const FRONTEND_RESET_URL = process.env.FRONTEND_RESET_URL || "http://localhost:3000/ResetPassword.html";

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await registerModel.findUserByEmail(email);

    // Deliberately respond the same way whether or not the email exists.
    // This is a standard security practice: it stops someone from using this
    // endpoint to figure out which emails have HawkerHub accounts.
    const genericResponse = {
      message: "If an account with that email exists, a password reset link has been sent."
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await passwordResetModel.setResetToken(user.user_id, token, expiry);

    const resetUrl = `${FRONTEND_RESET_URL}?token=${token}`;
    await emailService.sendPasswordResetEmail(user.email, resetUrl);

    res.status(200).json(genericResponse);
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Unable to process password reset request." });
  }
}

// PATCH /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    const user = await passwordResetModel.findUserByResetToken(token);

    if (!user || !user.token_expiry || new Date(user.token_expiry) < new Date()) {
      return res.status(401).json({ message: "This reset link is invalid or has expired." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await passwordResetModel.updatePasswordAndClearToken(user.user_id, passwordHash);

    res.status(200).json({
  message: "Password has been reset successfully. You can now sign in.",
  role: user.role});}
   catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Unable to reset password." });
  }
}

module.exports = { forgotPassword, resetPassword };
