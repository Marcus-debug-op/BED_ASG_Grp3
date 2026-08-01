const stallAssignmentModel = require("../Models/stallAssignmentModel");

// ============================================================================
// BED-145: Vendor Assignment API (Ryan Tan)
//
// Operator assigns / reassigns / vacates the vendor occupying a stall, and
// views current occupancy and history. All routes are operator-only.
// ============================================================================

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// GET /api/operator/stall-assignments
// All stalls' current occupants.
async function getAllAssignments(req, res) {
  try {
    const assignments = await stallAssignmentModel.getAllCurrentAssignments();
    res.status(200).json(assignments);
  } catch (error) {
    console.error("Error getting stall assignments:", error);
    res.status(500).json({ message: "Unable to load stall assignments." });
  }
}

// GET /api/operator/stall-assignments/:stallId
// Current occupant of one stall (404 if the stall is currently unoccupied).
async function getAssignmentForStall(req, res) {
  try {
    const stallId = parseId(req.params.stallId);
    if (!stallId) {
      return res.status(400).json({ message: "Invalid stall id." });
    }

    if (!(await stallAssignmentModel.stallExists(stallId))) {
      return res.status(404).json({ message: "Stall not found." });
    }

    const assignment = await stallAssignmentModel.getCurrentAssignment(stallId);
    if (!assignment) {
      return res.status(404).json({ message: "This stall currently has no assigned vendor." });
    }

    res.status(200).json(assignment);
  } catch (error) {
    console.error("Error getting stall assignment:", error);
    res.status(500).json({ message: "Unable to load stall assignment." });
  }
}

// GET /api/operator/stall-assignments/:stallId/history
// Full history of assignments for one stall.
async function getHistory(req, res) {
  try {
    const stallId = parseId(req.params.stallId);
    if (!stallId) {
      return res.status(400).json({ message: "Invalid stall id." });
    }

    if (!(await stallAssignmentModel.stallExists(stallId))) {
      return res.status(404).json({ message: "Stall not found." });
    }

    const history = await stallAssignmentModel.getAssignmentHistory(stallId);
    res.status(200).json(history);
  } catch (error) {
    console.error("Error getting assignment history:", error);
    res.status(500).json({ message: "Unable to load assignment history." });
  }
}

// POST /api/operator/stall-assignments
// Body: { stall_id, vendor_id, reassign? }
// Assign a vendor to a stall. If the stall is already occupied and reassign is
// not true, respond 400 so the operator explicitly confirms a reassignment.
async function assignVendor(req, res) {
  try {
    const { stall_id, vendor_id, reassign } = req.body;
    const operatorId = req.user && req.user.sub ? Number(req.user.sub) : null;

    // Guard the referenced rows exist and have the right roles BEFORE writing,
    // so we return clear 404s instead of relying on FK errors.
    if (!(await stallAssignmentModel.stallExists(stall_id))) {
      return res.status(404).json({ message: "Stall not found." });
    }
    if (!(await stallAssignmentModel.isVendor(vendor_id))) {
      return res.status(404).json({ message: "Vendor not found, or that user is not a vendor." });
    }

    const result = await stallAssignmentModel.assignVendor(
      stall_id,
      vendor_id,
      operatorId,
      reassign === true
    );

    if (result.error === "ALREADY_ASSIGNED_TO_SAME_VENDOR") {
      return res.status(400).json({ message: "That vendor is already assigned to this stall." });
    }
    if (result.error === "CONFLICT") {
      return res.status(400).json({
        message: "This stall is already occupied by another vendor. Resend with reassign=true to reassign it.",
        currentVendorId: result.currentVendorId
      });
    }
    if (result.error === "INVALID_REFERENCE") {
      return res.status(400).json({ message: "Invalid stall_id or vendor_id." });
    }

    res.status(201).json({ message: "Vendor assigned to stall.", assignment: result });
  } catch (error) {
    console.error("Error assigning vendor:", error);
    res.status(500).json({ message: "Unable to assign vendor to stall." });
  }
}

// DELETE /api/operator/stall-assignments/:stallId
// Vacate the current vendor from a stall, leaving it unoccupied.
async function vacateStall(req, res) {
  try {
    const stallId = parseId(req.params.stallId);
    if (!stallId) {
      return res.status(400).json({ message: "Invalid stall id." });
    }

    if (!(await stallAssignmentModel.stallExists(stallId))) {
      return res.status(404).json({ message: "Stall not found." });
    }

    const vacated = await stallAssignmentModel.vacateStall(stallId);
    if (!vacated) {
      return res.status(404).json({ message: "This stall currently has no assigned vendor to vacate." });
    }

    res.status(200).json({ message: "Stall vacated.", assignment: vacated });
  } catch (error) {
    console.error("Error vacating stall:", error);
    res.status(500).json({ message: "Unable to vacate stall." });
  }
}

module.exports = {
  getAllAssignments,
  getAssignmentForStall,
  getHistory,
  assignVendor,
  vacateStall
};