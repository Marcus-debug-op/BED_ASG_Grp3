const multer = require("multer");
const path = require("path");

const express = require("express");
const profileController = require("../Controllers/profileController");
const { validateUpdateProfile } = require("../Middlewares/profileValidation");
const uploadProfileImage = require("../Middlewares/uploadProfileImage");
const { requireAuth, blockGuests } = require("../Middlewares/authMiddleware");


const router = express.Router();



router.get("/my-profile", requireAuth, blockGuests, profileController.getMyProfile
  /*
    #swagger.tags = ['Profile']
    #swagger.description = 'Get logged-in user profile'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);
router.put("/my-profile", requireAuth, blockGuests, validateUpdateProfile, profileController.updateMyProfile
    /*
    #swagger.tags = ['Profile']
    #swagger.summary = 'Update user profile'
    #swagger.description = 'Updates the logged-in user profile.'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.put("/profile-picture", requireAuth, blockGuests, profileController.updateMyProfileImage
    /*
    #swagger.tags = ['Profile']
    #swagger.summary = 'Update profile picture URL'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.put("/profile-picture-upload", requireAuth, blockGuests, uploadProfileImage.single("profileImage"), profileController.uploadMyProfileImage
  /*
    #swagger.tags = ['Profile']
    #swagger.summary = 'Upload profile picture'
    #swagger.description = 'Uploads and replaces the logged-in user profile picture.'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.consumes = ['multipart/form-data']
    #swagger.parameters['profileImage'] = {
      in: 'formData',
      type: 'file',
      required: true,
      description: 'Profile image file'
    }
  */
);

module.exports = router;