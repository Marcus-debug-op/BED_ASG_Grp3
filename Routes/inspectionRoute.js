const express = require("express");
const inspectionController = require("../Controllers/inspectionController");
const { requireRole } = require("../Middlewares/authMiddleware");
const { validateScheduleInspection } = require("../Middlewares/inspectionValidation");

const router = express.Router();

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

router.put("/:inspectionId", requireRole("officer"), validateScheduleInspection, inspectionController.rescheduleInspection
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

module.exports = router;