const vendorDashboardModel = require("../Models/vendorDashboardModel");

// Validates the optional ?month=&year= filter (BED-73). Both must be
// provided together, month must be 1-12, year must be a real 4-digit year,
// and the combination cannot be in the future - matches the ticket's
// explicit "400 Bad Request if invalid date formats or future, unsupported
// months are queried" requirement.
function validateDateFilter(monthRaw, yearRaw) {
  // Filter is entirely optional - no params at all just means "today".
  if (monthRaw === undefined && yearRaw === undefined) {
    return { valid: true, month: null, year: null };
  }

  // If one is given, both must be given - a lone month or lone year is
  // ambiguous and is treated as invalid input, not silently ignored.
  if (monthRaw === undefined || yearRaw === undefined) {
    return { valid: false, message: "Both month and year must be provided together." };
  }

  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { valid: false, message: "Month must be an integer between 1 and 12." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { valid: false, message: "Year must be a valid 4-digit year." };
  }

  const now = new Date();
  const requestedIsFuture =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month > now.getMonth() + 1);

  if (requestedIsFuture) {
    return { valid: false, message: "Cannot request sales data for a future month." };
  }

  return { valid: true, month, year };
}

// GET /api/vendor/dashboard -> summary metrics for the vendor's dashboard homepage.
// Accepts optional ?month=&year= (BED-73) to view a specific past month instead
// of today/this week.
async function getDashboard(req, res) {
  try {
    const vendorId = req.user.sub;

    const filter = validateDateFilter(req.query.month, req.query.year);
    if (!filter.valid) {
      return res.status(400).json({ message: filter.message });
    }

    // The dashboard model uses MSSQL's shared connection. Run these queries in
    // sequence so one completed query cannot close the connection another one
    // is still using.
    const metrics = await vendorDashboardModel.getDashboardMetrics(vendorId, filter.month, filter.year);
    const recentOrders = await vendorDashboardModel.getRecentOrders(vendorId, 5, filter.month, filter.year);
    const topSellingDishes = await vendorDashboardModel.getTopSellingDishes(vendorId);

    // When a month/year filter is active, the revenue chart plots every day
    // of that month (labelled "1", "2", "3"...) instead of the current
    // Monday-Sunday week - both Recent Orders and the chart now follow the
    // same filter as the summary cards, instead of silently ignoring it.
    let chartLabels;
    let revenueValues;

    if (filter.month) {
      const monthlyRevenue = await vendorDashboardModel.getMonthlyRevenue(vendorId, filter.month, filter.year);
      const revenueByDate = new Map(monthlyRevenue.map((row) => [row.day_of_month, Number(row.day_revenue)]));

      const daysInMonth = new Date(filter.year, filter.month, 0).getDate();
      chartLabels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
      revenueValues = chartLabels.map((_, i) => revenueByDate.get(i + 1) || 0);
    } else {
      const weeklyRevenue = await vendorDashboardModel.getWeeklyRevenue(vendorId);
      const revenueByDay = new Map(
        weeklyRevenue.map((row) => [new Date(row.order_day).getDay(), Number(row.day_revenue)])
      );

      chartLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      revenueValues = [1, 2, 3, 4, 5, 6, 0].map((day) => revenueByDay.get(day) || 0);
    }

    // No fake fallback data. If the vendor genuinely has no orders/ratings/
    // dishes yet, the response says so honestly (empty arrays, real zeros) -
    // the frontend's own empty-state UI is what communicates that to the
    // vendor, not fabricated numbers pretending to be real.
    res.status(200).json({
      todayRevenue: Number(metrics.today_revenue).toFixed(2),
      todayOrders: metrics.today_orders,
      pendingOrders: metrics.pending_orders,
      averageRating: Number(metrics.average_rating).toFixed(1),
      recentOrders,
      weeklyRevenue: revenueValues,
      chartLabels,
      topSellingDishes
    });
  } catch (error) {
    console.error("Error getting vendor dashboard metrics:", error);

    res.status(500).json({
      message: "Unable to load dashboard metrics."
    });
  }
}

module.exports = { getDashboard };
