const multer = require("multer");

// Decide where uploaded stall profile pictures will be stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/stalls");
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

// Create multer upload middleware. 5MB cap so a stray huge upload doesn't
// fill the disk - same limit used for complaint/feedback photo uploads.
const uploadStallImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadStallImage;
