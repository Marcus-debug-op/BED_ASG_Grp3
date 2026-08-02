const express = require("express");
const stallAssignmentController = require("../Controllers/stallAssignmentController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateAssignVendor } = require("../Middlewares/stallAssignmentValidation");

const router = express.Router();

// ============================================================================
// BED-145: Vendor Assignment API (Ryan Tan)
// Mounted at /api/operator/stall-assignments. Operator-only.
//
// Route order note: the static "/" routes and the "/:stallId/history" route
// are declared so the more specific paths are matched correctly by Express.
// ============================================================================

// POST /api/operator/stall-assignments - assign (or reassign) a vendor to a stall
router.post("/", requireRole("operator"), validateAssignVendor, stallAssignmentController.assignVendor
/*
  #swagger.tags = ['Operator - Stall Assignments']
  #swagger.description = 'BED-145: Operator assigns a vendor to a stall. If the stall is already occupied, returns 400 unless reassign=true is supplied, in which case the current vendor is vacated and the new vendor assigned.'
  #swagger.security = [{ "bearerAuth": [] }]
  #swagger.parameters['body'] = {
    in: 'body',
    required: true,
    schema: { stall_id: 1, vendor_id: 3, reassign: false }
  }
  #swagger.responses[201] = { description: 'Vendor assigned' }
  #swagger.responses[400] = { description: 'Validation failed / invalid reference' }
  #swagger.responses[404] = { description: 'Stall or vendor not found' }
  #swagger.responses[400] = { description: 'Stall already occupied (reassign not requested)' }
*/
);

// GET /api/operator/stall-assignments - all stalls' current occupants
router.get("/", requireRole("operator"), stallAssignmentController.getAllAssignments
/*
  #swagger.tags = ['Operator - Stall Assignments']
  #swagger.description = 'BED-145: Operator views the current vendor occupying every stall.'
  #swagger.security = [{ "bearerAuth": [] }]
*/
);

// GET /api/operator/stall-assignments/:stallId/history - assignment history
// MUST be declared before "/:stallId" so "history" isn't read as an id... it is
// a longer path so Express matches it first regardless, but we keep it above
// for clarity.
router.get("/:stallId/history", requireRole("operator"), stallAssignmentController.getHistory
/*
  #swagger.tags = ['Stall Assignments']
  #swagger.description = 'BED-145: Operator views the full assignment history of one stall.'
  #swagger.security = [{ "bearerAuth": [] }]
*/
);

// GET /api/operator/stall-assignments/:stallId - current occupant of one stall
router.get("/:stallId", requireRole("operator"), stallAssignmentController.getAssignmentForStall
/*
  #swagger.tags = ['Operator - Stall Assignments']
  #swagger.description = 'BED-145: Operator views the current vendor assigned to one stall.'
  #swagger.security = [{ "bearerAuth": [] }]
  #swagger.responses[404] = { description: 'Stall not found or currently unoccupied' }
*/
);

// DELETE /api/operator/stall-assignments/:stallId - vacate the current vendor
router.delete("/:stallId", requireRole("operator"), stallAssignmentController.vacateStall
/*
  #swagger.tags = ['Operator - Stall Assignments']
  #swagger.description = 'BED-145: Operator vacates the current vendor from a stall, leaving it unoccupied.'
  #swagger.security = [{ "bearerAuth": [] }]
  #swagger.responses[404] = { description: 'Stall not found or already unoccupied' }
*/
);

module.exports = router;