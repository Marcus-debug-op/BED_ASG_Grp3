const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/feedback");
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
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
