const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/feedback");
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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Wrapped as a plain function (rather than exporting upload.single(...)
// directly) so Multer's file-size/type errors get turned into a proper
// JSON response instead of falling through to Express's default HTML
// error page. Called the same way as any other Express middleware:
// router.post(..., uploadFeedbackImage, ...)
function uploadFeedbackImage(req, res, next) {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Image file is too large. Maximum size is 5MB." });
      }

      return res.status(400).json({ message: err.message || "Invalid image upload." });
    }

    next();
  });
}

module.exports = uploadFeedbackImage;
