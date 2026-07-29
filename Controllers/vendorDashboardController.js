const vendorDashboardModel = require("../Models/vendorDashboardModel");

// GET /api/vendor/dashboard -> summary metrics for the vendor's dashboard homepage.
async function getDashboard(req, res) {
  try {
    const vendorId = req.user.sub;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    // The dashboard model uses MSSQL's shared connection. Run these queries in
    // sequence so one completed query cannot close the connection another one
    // is still using.
    const metrics = await vendorDashboardModel.getDashboardMetrics(
      vendorId,
      month,
      year
    );
    const recentOrders = await vendorDashboardModel.getRecentOrders(vendorId);
    const weeklyRevenue = await vendorDashboardModel.getWeeklyRevenue(vendorId);
    const topSellingDishes = await vendorDashboardModel.getTopSellingDishes(vendorId);

    const demoRecentOrders = [
      { order_id: 1042, customer_name: "Aisha Rahman", order_status: "Preparing" },
      { order_id: 1041, customer_name: "Marcus Lim", order_status: "Ready" },
      { order_id: 1040, customer_name: "Siti Nur", order_status: "Completed" },
      { order_id: 1039, customer_name: "Daniel Tan", order_status: "Pending" }
    ];
    const demoWeeklyRevenue = [18.5, 26.8, 31.2, 24.6, 38.9, 52.4, 45.7];
    const demoTopSellingDishes = [
      { item_name: "Chicken Rice", total_quantity: 42 },
      { item_name: "Laksa", total_quantity: 35 },
      { item_name: "Char Kway Teow", total_quantity: 28 },
      { item_name: "Fried Hokkien Mee", total_quantity: 21 },
      { item_name: "Teh Tarik", total_quantity: 18 }
    ];

    const revenueByDay = new Map(
      weeklyRevenue.map((row) => [new Date(row.order_day).getDay(), Number(row.day_revenue)])
    );
    const weeklyRevenueValues = [1, 2, 3, 4, 5, 6, 0].map((day) => revenueByDay.get(day) || 0);
    const hasWeeklyRevenue = weeklyRevenueValues.some((value) => value > 0);

    res.status(200).json({
      todayRevenue: Number(metrics.today_revenue).toFixed(2),
      todayOrders: metrics.today_orders,
      pendingOrders: metrics.pending_orders,
      averageRating: Number(metrics.average_rating).toFixed(1),
      recentOrders: recentOrders.length ? recentOrders : demoRecentOrders,
      weeklyRevenue: hasWeeklyRevenue ? weeklyRevenueValues : demoWeeklyRevenue,
      topSellingDishes: topSellingDishes.length ? topSellingDishes : demoTopSellingDishes,
      usingDemoData: !recentOrders.length || !hasWeeklyRevenue || !topSellingDishes.length
    });
  } catch (error) {
    console.error("Error getting vendor dashboard metrics:", error);

    res.status(500).json({
      message: "Unable to load dashboard metrics."
    });
  }
}

module.exports = { getDashboard };
