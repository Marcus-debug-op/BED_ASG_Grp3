const feedbackModel = require("../Models/feedbackModel");

// BED-2: POST /api/feedback
async function submitFeedback(req, res) {
  try {
    const patronId = req.user.sub;

    const created = await feedbackModel.createFeedback(patronId, req.body);

    res.status(201).json(created);
  } catch (error) {
    console.error("Error submitting feedback:", error);

    // SQL Server FK violation - stall_id doesn't exist.
    if (error.number === 547) {
      return res.status(400).json({
        message: "Stall not found."
      });
    }

    res.status(500).json({
      message: "Unable to submit feedback."
    });
  }
}

// BED-2: GET /api/vendor/feedback
async function getVendorFeedback(req, res) {
  try {
    const vendorId = req.user.sub;

    const feedback = await feedbackModel.getFeedbackForVendor(vendorId);

    res.status(200).json(feedback);
  } catch (error) {
    console.error("Error getting vendor feedback:", error);

    res.status(500).json({
      message: "Unable to load feedback."
    });
  }
}

// BED-92: PUT /api/feedback/:feedbackId
// Order matters here - this is the whole point of the ticket:
//   1. Fetch the row by feedback_id alone.
//   2. Compare row.patron_id to req.user.sub.
//   3. Only then run the write.
async function updateFeedback(req, res) {
  try {
    const patronId = req.user.sub;
    const feedbackId = Number(req.params.feedbackId);

    const existing = await feedbackModel.getFeedbackById(feedbackId);

    if (!existing) {
      return res.status(404).json({
        message: "Feedback not found."
      });
    }

    if (existing.patron_id !== patronId) {
      return res.status(403).json({
        message: "You can only edit your own feedback."
      });
    }

    const updated = await feedbackModel.updateFeedback(feedbackId, patronId, req.body);

    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating feedback:", error);

    if (error.number === 547) {
      return res.status(400).json({
        message: "Stall not found."
      });
    }

    res.status(500).json({
      message: "Unable to update feedback."
    });
  }
}

// BED-92: DELETE /api/feedback/:feedbackId
// Same ownership-then-write order as updateFeedback above.
async function deleteFeedback(req, res) {
  try {
    const patronId = req.user.sub;
    const feedbackId = Number(req.params.feedbackId);

    const existing = await feedbackModel.getFeedbackById(feedbackId);

    if (!existing) {
      return res.status(404).json({
        message: "Feedback not found."
      });
    }

    if (existing.patron_id !== patronId) {
      return res.status(403).json({
        message: "You can only delete your own feedback."
      });
    }

    await feedbackModel.deleteFeedback(feedbackId, patronId);

    res.status(200).json({
      message: "Feedback deleted."
    });
  } catch (error) {
    console.error("Error deleting feedback:", error);

    res.status(500).json({
      message: "Unable to delete feedback."
    });
  }
}

module.exports = {
  submitFeedback,
  getVendorFeedback,
  updateFeedback,
  deleteFeedback
};