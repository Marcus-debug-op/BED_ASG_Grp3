const profileModel = require("../Models/profileModel");

async function getMyProfile(req, res) {
  try {
    const userId = req.user.sub;

    const profile = await profileModel.getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found."
      });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Error loading profile:", error);

    res.status(500).json({
      message: "Unable to load profile."
    });
  }
}

async function updateMyProfileImage(req, res) {
  try {
    const userId = req.user.sub;
    const { profile_image_url } = req.body;

    if (!profile_image_url) {
      return res.status(400).json({
        message: "Profile image URL is required."
      });
    }

    const rowsAffected = await profileModel.updateProfileImage(
      userId,
      profile_image_url
    );

    if (!rowsAffected) {
      return res.status(404).json({
        message: "Profile not found."
      });
    }

    res.status(200).json({
      message: "Profile picture updated successfully.",
      profile_image_url
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);

    res.status(500).json({
      message: "Unable to update profile picture."
    });
  }
}

async function uploadMyProfileImage(req, res) {
  try {
    const userId = req.user.sub;

    if (!req.file) {
      return res.status(400).json({
        message: "No image file uploaded."
      });
    }

    const profileImageUrl = `uploads/profile/${req.file.filename}`;

    const rowsAffected = await profileModel.updateProfileImage(
      userId,
      profileImageUrl
    );

    if (!rowsAffected) {
      return res.status(404).json({
        message: "Profile not found."
      });
    }

    res.status(200).json({
      message: "Profile picture uploaded successfully.",
      profile_image_url: profileImageUrl
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);

    res.status(500).json({
      message: "Unable to upload profile picture."
    });
  }
}

async function updateMyProfile(req, res) {
  try {
    const userId = req.user.sub;
    const { full_name, phone_number } = req.body;


    const updatedUser = await profileModel.updateProfileByUserId(
      userId,
      full_name,
      phone_number
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "Profile not found."
      });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser
    });

  } catch (error) {
    console.error("Error updating profile:", error);

    res.status(500).json({
      message: "Unable to update profile."
    });
  }
}

module.exports = {
  getMyProfile,
  updateMyProfileImage,
  uploadMyProfileImage,
  updateMyProfile,
};