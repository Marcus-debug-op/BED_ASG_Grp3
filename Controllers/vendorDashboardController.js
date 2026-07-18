const vendorDashboardModel = require("../Models/vendorDashboardModel");

// GET /api/vendor/dashboard -> summary metrics for the vendor's dashboard homepage.
async function getDashboard(req, res) {
  try {
    const vendorId = req.user.sub;
    const metrics = await vendorDashboardModel.getDashboardMetrics(vendorId);

    res.status(200).json({
      todayRevenue: Number(metrics.today_revenue).toFixed(2),
      todayOrders: metrics.today_orders,
      pendingOrders: metrics.pending_orders,
      averageRating: Number(metrics.average_rating).toFixed(1)
    });
  } catch (error) {
    console.error("Error getting vendor dashboard metrics:", error);

    res.status(500).json({
      message: "Unable to load dashboard metrics."
    });
  }
}

module.exports = { getDashboard };
