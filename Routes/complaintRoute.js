const express = require("express");
const complaintController = require("../Controllers/complaintController");
const { requireRole, blockGuests } = require("../Middlewares/authMiddleware");
const { validateStatusUpdate, validateComplaintSubmission } = require("../Middlewares/complaintValidation");
const uploadComplaintImage = require("../Middlewares/uploadComplaintImage");

const router = express.Router();

// Any registered (non-guest) user can file a new complaint. Guests are
// blocked since Complaints.patron_id is a NOT NULL FK to Users - there's
// no row to attach a guest's complaint to.
// BED-131: uploadComplaintImage runs before validation so multer has
// already parsed multipart fields into req.body by the time Joi checks it;
// the image itself is optional (a text-only complaint still succeeds).
router.post("/", blockGuests, uploadComplaintImage.single("image"), validateComplaintSubmission, complaintController.submitComplaint
/*
  #swagger.tags = ['Patron - Complaints']
  #swagger.description = 'A registered user submits a complaint against a stall, or a General Facility complaint with no specific stall (details, date, complaint text, optional image). On success, a unique tracking id is generated and the complaint is created with a default "Open" status, so the user knows their complaint was officially received.'
  #swagger.security = [{ "bearerAuth": [] }]
  #swagger.consumes = ['multipart/form-data']
  #swagger.parameters['image'] = { in: 'formData', type: 'file', required: false, description: 'Optional photo evidence for the complaint.' }
*/);

// Officer + Operator: reviewing and resolving complaints filed against
// vendors. Which role can act on which complaint is enforced per-request
// in the controller, based on complaint_type (Hygiene -> officer, else
// -> operator) - not by role alone.
router.get("/", requireRole("officer", "operator"), complaintController.listComplaints
/*
  #swagger.tags = ['Staff - Complaint Management']
  #swagger.description = 'Officer/operator retrieves the list of complaints they are responsible for (officers see Hygiene complaints, operators see every other type), with optional filtering by status or stall.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.get("/:complaintId", requireRole("officer", "operator"), complaintController.getComplaint
/*
  #swagger.tags = ['Staff - Complaint Management']
  #swagger.description = 'Officer/operator retrieves the full detail of a single complaint they are responsible for, including its resolution notes.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

router.patch("/:complaintId", requireRole("officer", "operator"), validateStatusUpdate, complaintController.updateComplaint
/*
  #swagger.tags = ['Staff - Complaint Management']
  #swagger.description = 'Officer/operator updates a complaint they are responsible for - moving its status (e.g. Open -> In Progress -> Resolved) and appending a resolution note - closing the loop from initial submission to final resolution.'
  #swagger.security = [{ "bearerAuth": [] }]
*/);

module.exports = router;