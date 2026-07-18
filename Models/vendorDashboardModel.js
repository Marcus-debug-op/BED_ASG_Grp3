const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Aggregates today's revenue/orders, currently pending orders, and average rating
// across every stall this vendor owns. Returns zeros (not null) when the vendor has
// no stalls, no orders yet, or no feedback yet - keeps the dashboard cards clean
// instead of showing "NaN" or blank on a brand new vendor account.
async function getDashboardMetrics(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);

    const ordersResult = await request.query(`
      SELECT
        ISNULL(SUM(CASE WHEN CAST(o.order_date AS DATE) = CAST(GETDATE() AS DATE) THEN o.total_amount ELSE 0 END), 0) AS today_revenue,
        ISNULL(SUM(CASE WHEN CAST(o.order_date AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END), 0) AS today_orders,
        ISNULL(SUM(CASE WHEN o.order_status IN ('Pending', 'Preparing') THEN 1 ELSE 0 END), 0) AS pending_orders
      FROM Stalls s
      LEFT JOIN Orders o ON o.stall_id = s.stall_id
      WHERE s.vendor_id = @vendor_id;
    `);

    const ratingRequest = connection.request();
    ratingRequest.input("vendor_id", sql.Int, vendorId);

    const ratingResult = await ratingRequest.query(`
      SELECT ISNULL(AVG(CAST(f.rating AS FLOAT)), 0) AS average_rating
      FROM Stalls s
      LEFT JOIN Feedbacks f ON f.stall_id = s.stall_id
      WHERE s.vendor_id = @vendor_id;
    `);

    return {
      today_revenue: ordersResult.recordset[0].today_revenue,
      today_orders: ordersResult.recordset[0].today_orders,
      pending_orders: ordersResult.recordset[0].pending_orders,
      average_rating: ratingResult.recordset[0].average_rating
    };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = { getDashboardMetrics };
