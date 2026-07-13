const complaintModel = require("../Models/complaintModel");

// GET /api/vendor/complaints?status=Open - always scoped to the logged-in vendor's own stalls.
async function listMyComplaints(req, res) {
  try {
    const vendorId = req.user.sub;
    const status = req.query.status || null;

    const complaints = await complaintModel.getComplaintsForVendor(vendorId, status);

    res.status(200).json(complaints);
  } catch (error) {
    console.error("Error listing vendor complaints:", error);

    res.status(500).json({
      message: "Unable to load complaints."
    });
  }
}

async function getMyComplaint(req, res) {
  try {
    const vendorId = req.user.sub;
    const complaintId = Number(req.params.complaintId);

    const complaint = await complaintModel.getComplaintByIdForVendor(complaintId, vendorId);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    res.status(200).json(complaint);
  } catch (error) {
    console.error("Error getting vendor complaint:", error);

    res.status(500).json({
      message: "Unable to load complaint."
    });
  }
}

// PATCH /api/vendor/complaints/:complaintId/acknowledge - the vendor's only
// write action on a complaint. No arbitrary status changes, no delete -
// investigation and resolution stay with an NEA officer.
async function acknowledgeMyComplaint(req, res) {
  try {
    const vendorId = req.user.sub;
    const complaintId = Number(req.params.complaintId);

    const result = await complaintModel.acknowledgeComplaint(complaintId, vendorId);

    if (result.outcome === "not_found") {
      return res.status(404).json({
        message: "Complaint not found."
      });
    }

    if (result.outcome === "invalid_status") {
      return res.status(409).json({
        message: `This complaint can no longer be acknowledged - its status is already "${result.currentStatus}".`
      });
    }

    res.status(200).json(result.complaint);
  } catch (error) {
    console.error("Error acknowledging complaint:", error);

    res.status(500).json({
      message: "Unable to acknowledge complaint."
    });
  }
}

module.exports = {
  listMyComplaints,
  getMyComplaint,
  acknowledgeMyComplaint
};