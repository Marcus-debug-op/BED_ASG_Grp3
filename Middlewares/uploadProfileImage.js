const multer = require("multer");
const path = require("path");

// Decide where uploaded profile images will be stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/profile");
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed."), false);
  }

  cb(null, true);
};

// Create multer upload middleware
const uploadProfileImage = multer({
  storage,
  fileFilter
});

module.exports = uploadProfileImage;