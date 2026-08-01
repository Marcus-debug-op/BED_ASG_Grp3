const profileModel = require("../Models/profileModel");

// GET /api/profile/my-profile
// This function retrieves the profile of the currently logged-in user.
// The user's ID comes from req.user.sub, which is decoded from the JWT token.
async function getMyProfile(req, res) {
  try {
    const userId = req.user.sub;  // req.user.sub stores the logged-in user's user_id from the JWT token.

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

// PUT /api/profile/profile-image
// This function updates the user's profile image using an image URL from req.body.
// It is useful if the frontend already has the image URL.
async function updateMyProfileImage(req, res) {
  try {
    const userId = req.user.sub; // Get the logged-in user's ID from the JWT token.
    const { profile_image_url } = req.body; // Read the image URL sent from the frontend.

    // Validate that an image URL was provided.
    if (!profile_image_url) {
      return res.status(400).json({
        message: "Profile image URL is required."
      });
    }

    // Update the profile image URL in the database.
    const rowsAffected = await profileModel.updateProfileImage(
      userId,
      profile_image_url
    );

    // If no row was updated, the profile was not found.
    if (!rowsAffected) {
      return res.status(404).json({
        message: "Profile not found."
      });
    }

     // Return success response with the updated image URL.
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

// PUT /api/profile/profile-picture-upload
// This function handles profile image upload using multer.
// req.file is created by the multer middleware after the file is uploaded.
async function uploadMyProfileImage(req, res) {
  try {
    const userId = req.user.sub;

    // If multer does not receive a file, return a bad request.
    if (!req.file) {
      return res.status(400).json({
        message: "No image file uploaded."
      });
    }

    // Store the image path that will be saved in the database.
    // The actual file is stored in public/uploads/profile.
    const profileImageUrl = `/uploads/profile/${req.file.filename}`;

    // Update the user's profile image URL in the database.
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


// PUT /api/profile/my-profile
// This function updates the logged-in user's editable profile details.
// In this project, users can update full_name and phone_number,
// while email is kept non-editable because it is used as a unique account identifier.
async function updateMyProfile(req, res) {
  try {
    const userId = req.user.sub; // Get the logged-in user's ID from the JWT token.
    const { full_name, phone_number } = req.body; // Read editable profile fields from the request body.

     // Ask the model to update the user's profile in the Users table.
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