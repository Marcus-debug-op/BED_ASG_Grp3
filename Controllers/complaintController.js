const complaintModel = require("../Models/complaintModel");

// GET /api/complaints?status=Open&vendor_id=3 - always scoped to the caller's
// own queue: an officer only ever sees Hygiene complaints, an operator only
// ever sees everything else (Service, Food Quality, Overcharging, Other).
async function listComplaints(req, res) {
  try {
    const status = req.query.status || null;
    const vendorId = req.query.vendor_id ? Number(req.query.vendor_id) : null;
    const typeScope = req.user.role === "officer" ? "hygiene" : "other";

    const complaints = await complaintModel.getComplaints({ status, vendorId, typeScope });

    res.status(200).json(complaints);
  } catch (error) {
    console.error("Error listing complaints:", error);

    res.status(500).json({
      message: "Unable to load complaints."
    });
  }
}

async function getComplaint(req, res) {
  try {
    const complaintId = Number(req.params.complaintId);

    const complaint = await complaintModel.getComplaintById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    // A "Hygiene" complaint is an officer's case, everything else is an
    // operator's - reject if the logged-in role doesn't match this
    // complaint's type, even if their role is valid for the /api/complaints
    // route in general.
    const requiredRole = complaintModel.requiredRoleForType(complaint.complaint_type);
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        message: `This is a "${complaint.complaint_type}" complaint, which is handled by ${requiredRole}s, not ${req.user.role}s.`
      });
    }

    res.status(200).json(complaint);
  } catch (error) {
    console.error("Error getting complaint:", error);

    res.status(500).json({
      message: "Unable to load complaint."
    });
  }
}

// PATCH /api/complaints/:complaintId - updates status and (optionally) appends
// a resolution note, attributed to whichever officer/operator made the request.
async function updateComplaint(req, res) {
  try {
    const complaintId = Number(req.params.complaintId);
    const actorId = req.user.sub;
    const { status, note } = req.body;

    const existing = await complaintModel.getComplaintById(complaintId);

    if (!existing) {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    const requiredRole = complaintModel.requiredRoleForType(existing.complaint_type);
    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        message: `This is a "${existing.complaint_type}" complaint, which is handled by ${requiredRole}s, not ${req.user.role}s.`
      });
    }

    const updated = await complaintModel.updateComplaintStatus(complaintId, actorId, status, note);

    if (!updated) {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating complaint:", error);

    res.status(500).json({
      message: "Unable to update complaint."
    });
  }
}

module.exports = {
  listComplaints,
  getComplaint,
  updateComplaint
};
