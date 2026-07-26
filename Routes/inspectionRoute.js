const express = require("express");
const inspectionController = require("../Controllers/inspectionController");
const { requireRole } = require("../Middlewares/authMiddleware");
const {   validateScheduleInspection,validateRescheduleInspection,validateCompleteInspection } = require("../Middlewares/inspectionValidation");

const router = express.Router();  


// NEA inspection scheduling routes.
// All routes are restricted to users with the officer role.

router.post("/", requireRole("officer"),validateScheduleInspection,inspectionController.scheduleInspection
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer schedules an inspection for a valid stall'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        stall_id: 1,
        inspection_date: '2026-08-01T10:00:00'
      }
    }
  */
);

router.get("/scheduled", requireRole("officer"), inspectionController.getUpcomingScheduledInspections
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer views upcoming scheduled inspections'
    #swagger.security = [{ "bearerAuth": [] }]
  */
);

router.put("/:inspectionId", requireRole("officer"), validateRescheduleInspection, inspectionController.rescheduleInspection
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer reschedules an existing scheduled inspection'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['inspectionId'] = {
      in: 'path',
      required: true,
      type: 'integer'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        stall_id: 1,
        inspection_date: '2026-08-02T14:00:00'
      }
    }
  */
);

router.patch("/:inspectionId/cancel", requireRole("officer"), inspectionController.cancelInspection
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer cancels a scheduled inspection'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['inspectionId'] = {
      in: 'path',
      required: true,
      type: 'integer'
    }
  */
);

// DELETE is implemented as a soft delete.
// It cancels the inspection instead of permanently removing the row from SQL Server.
router.delete("/:inspectionId", requireRole("officer"), inspectionController.cancelInspection
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer deletes/cancels a scheduled inspection using soft delete'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['inspectionId'] = {
      in: 'path',
      required: true,
      type: 'integer'
    }
  */
);


router.get("/", requireRole("officer"), inspectionController.getInspectionRecords
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer views inspection records, optionally filtered by stall ID'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['stall_id'] = {
      in: 'query',
      required: false,
      type: 'integer',
      description: 'Optional stall ID filter'
    }
  */
);


// Records the completed inspection result and updates the stall hygiene grade.
router.patch("/:inspectionId/result",requireRole("officer"),validateCompleteInspection,inspectionController.completeInspectionResult
  /*
    #swagger.tags = ['Inspections']
    #swagger.description = 'NEA officer records inspection result and hygiene grade'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['inspectionId'] = {
      in: 'path',
      required: true,
      type: 'integer'
    }
    #swagger.parameters['body'] = {
      in: 'body',
      required: true,
      schema: {
        score: 85,
        hygiene_grade: 'A',
        remarks: 'Stall is clean and food preparation area is well maintained.',
        result: 'Pass'
      }
    }
  */
);

module.exports = router;