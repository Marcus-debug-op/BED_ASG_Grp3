const inspectionModel = require("../Models/inspectionModel");


// Create a new scheduled inspection for an existing stall.
// The officer ID comes from the JWT token so users cannot schedule on behalf of another officer.
async function scheduleInspection(req, res) {
  try {
    const officerId = req.user.sub;
    const { stall_id, inspection_date } = req.body;

    // Check the stall first so the API returns a clear 404 message
    // instead of relying only on a database foreign key error.
    const exists = await inspectionModel.stallExists(stall_id);

    if (!exists) {
      return res.status(404).json({
        message: "Stall not found."
      });
    }

    const inspection = await inspectionModel.scheduleInspection(
      stall_id,
      officerId,
      inspection_date
    );

    res.status(201).json({
      message: "Inspection scheduled successfully.",
      inspection
    });
  } catch (error) {
    console.error("Error scheduling inspection:", error);

    res.status(500).json({
      message: "Unable to schedule inspection."
    });
  }
}

async function getUpcomingScheduledInspections(req, res) {
  try {
    const officerId = req.user.sub;

    const inspections = await inspectionModel.getUpcomingScheduledInspections(
      officerId
    );

    res.status(200).json(inspections);
  } catch (error) {
    console.error("Error loading scheduled inspections:", error);

    res.status(500).json({
      message: "Unable to load scheduled inspections."
    });
  }
}

// Check the stall first so the API returns a clear 404 message
// instead of relying only on a database foreign key error.
async function rescheduleInspection(req, res) {
  try {
    const officerId = req.user.sub;
    const inspectionId = Number(req.params.inspectionId);
    const { inspection_date } = req.body;

    if (Number.isNaN(inspectionId)) {
      return res.status(400).json({
        message: "Invalid inspection ID."
      });
    }

    const updatedInspection = await inspectionModel.rescheduleInspection(
      inspectionId,
      officerId,
      inspection_date
    );

    if (!updatedInspection) {
      return res.status(404).json({
        message: "Inspection not found or cannot be rescheduled."
      });
    }

    res.status(200).json({
      message: "Inspection rescheduled successfully.",
      inspection: updatedInspection
    });
  } catch (error) {
    console.error("Error rescheduling inspection:", error);

    res.status(500).json({
      message: "Unable to reschedule inspection."
    });
  }
}

// Cancel/delete a scheduled inspection using a soft delete approach.
// The record is kept for activity history, but its status becomes Cancelled.
async function cancelInspection(req, res) {
  try {
    const officerId = req.user.sub;
    const inspectionId = Number(req.params.inspectionId);

    if (Number.isNaN(inspectionId)) {
      return res.status(400).json({
        message: "Invalid inspection ID."
      });
    }

    const cancelledInspection = await inspectionModel.cancelInspection(
      inspectionId,
      officerId
    );

    if (!cancelledInspection) {
      return res.status(404).json({
        message: "Inspection not found or cannot be cancelled."
      });
    }

    res.status(200).json({
      message: "Inspection cancelled successfully.",
      inspection: cancelledInspection
    });
  } catch (error) {
    console.error("Error cancelling inspection:", error);

    res.status(500).json({
      message: "Unable to cancel inspection."
    });
  }
}

// Record the inspection result after the officer completes the visit.
// This updates both the inspection record and the stall's latest hygiene grade.
async function completeInspectionResult(req, res) {
  try {
    const officerId = req.user.sub;
    const inspectionId = Number(req.params.inspectionId);

    const { score, hygiene_grade, remarks, result } = req.body;

    if (Number.isNaN(inspectionId)) {
      return res.status(400).json({
        message: "Invalid inspection ID."
      });
    }

    const completedInspection = await inspectionModel.completeInspectionResult(inspectionId,officerId,score,hygiene_grade,remarks,result);

    if (!completedInspection) {
      return res.status(404).json({
        message: "Scheduled inspection not found or cannot be completed."
      });
    }

    res.status(200).json({
      message: "Inspection result recorded successfully.",
      inspection: completedInspection
    });
  } catch (error) {
    console.error("Error completing inspection:", error);

    res.status(500).json({
      message: "Unable to record inspection result."
    });
  }
}

// Record the inspection result after the officer completes the visit.
// This updates both the inspection record and the stall's latest hygiene grade.
async function getInspectionRecords(req, res) {
  try {
    const stallId = req.query.stall_id ? Number(req.query.stall_id) : null;

    if (req.query.stall_id && Number.isNaN(stallId)) {
      return res.status(400).json({
        message: "Invalid stall ID."
      });
    }

    const inspections = await inspectionModel.getInspectionRecords(stallId);

    res.status(200).json(inspections);
  } catch (error) {
    console.error("Error loading inspection records:", error);

    res.status(500).json({
      message: "Unable to load inspection records."
    });
  }
}


module.exports = {
  scheduleInspection,
  getUpcomingScheduledInspections,
  rescheduleInspection,
  cancelInspection,
  completeInspectionResult,
  getInspectionRecords,
};