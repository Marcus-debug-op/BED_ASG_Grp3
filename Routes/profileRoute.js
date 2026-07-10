const multer = require("multer");
const path = require("path");

const express = require("express");
const profileController = require("../Controllers/profileController");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");

const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/profile");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }

    cb(null, true);
  }
});

router.get("/my-profile", requireAuth, blockGuests, profileController.getMyProfile);
router.put("/profile-picture", requireAuth, blockGuests, profileController.updateMyProfileImage);
router.put("/profile-picture-upload", requireAuth, blockGuests, upload.single("profileImage"), profileController.uploadMyProfileImage);
router.put("/my-profile", requireAuth, blockGuests, profileController.updateMyProfile);
module.exports = router;