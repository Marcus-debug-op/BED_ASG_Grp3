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

module.exports = {
  submitFeedback,
  getVendorFeedback
};