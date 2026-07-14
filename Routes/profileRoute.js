const multer = require("multer");
const path = require("path");

const express = require("express");
const profileController = require("../Controllers/profileController");
const { validateUpdateProfile } = require("../Middlewares/profileValidation");
const uploadProfileImage = require("../Middlewares/uploadProfileImage");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");


const router = express.Router();



router.get("/my-profile", requireAuth, blockGuests, profileController.getMyProfile);
router.put("/my-profile", requireAuth, blockGuests, validateUpdateProfile, profileController.updateMyProfile);
router.put("/profile-picture", requireAuth, blockGuests, profileController.updateMyProfileImage);
router.put("/profile-picture-upload", requireAuth, blockGuests, uploadProfileImage.single("profileImage"), profileController.uploadMyProfileImage);

module.exports = router;