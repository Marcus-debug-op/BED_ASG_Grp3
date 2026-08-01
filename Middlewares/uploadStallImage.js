const multer = require("multer");

// Decide where uploaded stall profile pictures will be stored
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/stalls");
  },

  filename: (req, file, cb) => {
    // Sanitise the original filename: spaces and characters like # ? & or
    // non-ASCII survive into the stored path and then break the <img src>
    // URL on the frontend (the file saves fine, but the browser 404s it).
    const safeName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
    const uniqueName = `${Date.now()}-${safeName}`;
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
