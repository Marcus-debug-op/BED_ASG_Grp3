const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/complaints");
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

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed."), false);
  }

  cb(null, true);
};

// 5MB cap - the ticket's acceptance criteria requires rejecting oversized
// uploads with a validation error, not silently accepting anything.
const uploadComplaintImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = uploadComplaintImage;
