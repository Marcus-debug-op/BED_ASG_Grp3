const neaAnalyticsModel = require("../Models/neaAnalyticsModel");

async function getAnalytics(req, res) {
  try {
    const analytics = await neaAnalyticsModel.getAnalytics();

    res.status(200).json({
      gradeDistribution: analytics.gradeDistribution.map((row) => ({
        grade: row.grade,
        inspectionCount: Number(row.inspection_count)
      })),
      monthlyTrends: analytics.monthlyTrends.map((row) => ({
        month: row.month,
        inspectionCount: Number(row.inspection_count)
      })),
      flaggedStalls: analytics.flaggedStalls.map((row) => ({
        stallId: Number(row.stall_id),
        stallName: row.stall_name,
        consecutivePoorGrades: Number(row.consecutive_poor_grades),
        latestPoorInspection: row.latest_poor_inspection
      }))
    });
  } catch (error) {
    console.error("Error loading NEA inspection analytics:", error);

    res.status(500).json({
      message: "Unable to load NEA inspection analytics."
    });
  }
}

module.exports = { getAnalytics };