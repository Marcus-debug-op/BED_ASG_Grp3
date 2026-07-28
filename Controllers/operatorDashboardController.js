const operatorDashboardModel = require("../Models/operatorDashboardModel");

async function getMetrics(req, res) {
  try {
    const metrics = await operatorDashboardModel.getDashboardMetrics();

    res.status(200).json({
      financialMetrics: {
        totalRevenue: Number(metrics.financial.total_revenue),
        totalOrders: Number(metrics.financial.total_orders),
        completedOrders: Number(metrics.financial.completed_orders)
      },
      stallMetrics: {
        totalStalls: Number(metrics.stalls.total_stalls),
        activeStalls: Number(metrics.stalls.active_stalls),
        inactiveStalls: Number(metrics.stalls.inactive_stalls)
      },
      rentalMetrics: {
        activeAgreements: Number(metrics.rentals.active_agreements),
        expiringLeases: Number(metrics.rentals.expiring_leases),
        rentalDataAvailable: Boolean(metrics.rentals.rental_data_available)
      },
      complaintMetrics: {
        pendingComplaints: Number(metrics.complaints.pending_complaints)
      },
      hygieneMetrics: {
        grades: metrics.hygieneGrades.map((row) => ({
          grade: row.hygiene_grade,
          stallCount: Number(row.stall_count)
        }))
      },
      // Convert the sparse day-rows the DB returned into a fixed 7-slot
      // Mon-Sun array (0 for any day with no completed orders), so the
      // frontend chart can plot it directly without doing its own date math.
      revenueTrend: (() => {
        const monday = new Date();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        monday.setHours(0, 0, 0, 0);

        return Array.from({ length: 7 }, (_, i) => {
          const day = new Date(monday);
          day.setDate(monday.getDate() + i);
          const dayKey = day.toISOString().slice(0, 10);

          const match = metrics.revenueTrend.find((row) =>
            new Date(row.order_day).toISOString().slice(0, 10) === dayKey
          );

          return match ? Number(match.day_revenue) : 0;
        });
      })()
    });
  } catch (error) {
    console.error("Error loading operator dashboard metrics:", error);
    res.status(500).json({
      message: "Unable to load operator dashboard metrics."
    });
  }
}

module.exports = { getMetrics };