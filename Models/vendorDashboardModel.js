const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Aggregates today's revenue/orders, currently pending orders, and average rating
// across every stall this vendor owns. Returns zeros (not null) when the vendor has
// no stalls, no orders yet, or no feedback yet - keeps the dashboard cards clean
// instead of showing "NaN" or blank on a brand new vendor account.
async function getDashboardMetrics(vendorId, month, year) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);

    const useFilter =
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12 &&
      Number.isInteger(year);

    request.input("month", sql.Int, useFilter ? month : null);
    request.input("year", sql.Int, useFilter ? year : null);

    const ordersResult = await request.query(`
      SELECT
    ISNULL(
        SUM(
            CASE
                WHEN (
                    (@month IS NULL AND CAST(o.order_date AS DATE) = CAST(GETDATE() AS DATE))
                    OR
                    (@month IS NOT NULL
                     AND MONTH(o.order_date)=@month
                     AND YEAR(o.order_date)=@year)
                )
                THEN o.total_amount
                ELSE 0
            END
        ),
        0
    ) AS today_revenue,

    ISNULL(
        SUM(
            CASE
                WHEN (
                    (@month IS NULL AND CAST(o.order_date AS DATE)=CAST(GETDATE() AS DATE))
                    OR
                    (@month IS NOT NULL
                     AND MONTH(o.order_date)=@month
                     AND YEAR(o.order_date)=@year)
                )
                THEN 1
                ELSE 0
            END
        ),
        0
    ) AS today_orders,

    ISNULL(
        SUM(
            CASE
                WHEN o.order_status IN ('Pending','Preparing')
                AND (
                    @month IS NULL
                    OR
                    (
                        MONTH(o.order_date)=@month
                        AND YEAR(o.order_date)=@year
                    )
                )
                THEN 1
                ELSE 0
            END
        ),
        0
    ) AS pending_orders

FROM Stalls s
LEFT JOIN Orders o
ON o.stall_id = s.stall_id

WHERE s.vendor_id = @vendor_id;
    `);

    const ratingRequest = connection.request();

ratingRequest.input("vendor_id", sql.Int, vendorId);
ratingRequest.input("month", sql.Int, useFilter ? month : null);
ratingRequest.input("year", sql.Int, useFilter ? year : null);

    const ratingResult = await ratingRequest.query(`
      SELECT
    ISNULL(AVG(CAST(f.rating AS FLOAT)),0) AS average_rating
FROM Stalls s
LEFT JOIN Feedbacks f
ON f.stall_id = s.stall_id
AND (
    @month IS NULL
    OR
    (
        MONTH(f.created_at)=@month
        AND YEAR(f.created_at)=@year
    )
)
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

// Last 5 orders across every stall owned by this vendor, newest first.
// Last 5 orders across every stall owned by this vendor, newest first.
// If a month/year filter is supplied (BED-73), only return orders from that month.
async function getRecentOrders(vendorId, limit = 5, month = null, year = null) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);
    request.input("limit", sql.Int, limit);
    request.input("month", sql.Int, month);
    request.input("year", sql.Int, year);

    const result = await request.query(`
      SELECT TOP (@limit)
        o.order_id,
        o.order_status,
        o.order_date,
        u.full_name AS customer_name
      FROM Orders o
      INNER JOIN Stalls s
        ON o.stall_id = s.stall_id
      INNER JOIN Users u
        ON o.patron_id = u.user_id
      WHERE s.vendor_id = @vendor_id
        AND (
          @month IS NULL
          OR (
            MONTH(o.order_date) = @month
            AND YEAR(o.order_date) = @year
          )
        )
      ORDER BY o.order_date DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Revenue from Monday through Sunday for the current week.
async function getWeeklyRevenue(vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      DECLARE @monday DATE = DATEADD(WEEK, DATEDIFF(WEEK, 0, GETDATE()), 0);
      DECLARE @nextMonday DATE = DATEADD(DAY, 7, @monday);

      SELECT CAST(o.order_date AS DATE) AS order_day,
        SUM(o.total_amount) AS day_revenue
      FROM Orders o
      INNER JOIN Stalls s ON o.stall_id = s.stall_id
      WHERE s.vendor_id = @vendor_id
        AND o.order_date >= @monday AND o.order_date < @nextMonday
      GROUP BY CAST(o.order_date AS DATE);
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Revenue per day for a selected month (BED-73)
async function getMonthlyRevenue(vendorId, month, year) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);
    request.input("month", sql.Int, month);
    request.input("year", sql.Int, year);

    const result = await request.query(`
      SELECT
        DAY(o.order_date) AS day_of_month,
        SUM(o.total_amount) AS day_revenue
      FROM Orders o
      INNER JOIN Stalls s
        ON o.stall_id = s.stall_id
      WHERE s.vendor_id = @vendor_id
        AND MONTH(o.order_date) = @month
        AND YEAR(o.order_date) = @year
      GROUP BY DAY(o.order_date)
      ORDER BY DAY(o.order_date);
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Top dishes by quantity sold across all of this vendor's stalls.
async function getTopSellingDishes(vendorId, limit = 5) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);
    const request = connection.request();
    request.input("vendor_id", sql.Int, vendorId);
    request.input("limit", sql.Int, limit);

    const result = await request.query(`
      SELECT TOP (@limit) mi.item_name, SUM(oi.quantity) AS total_quantity
      FROM OrderItems oi
      INNER JOIN Orders o ON oi.order_id = o.order_id
      INNER JOIN Stalls s ON o.stall_id = s.stall_id
      INNER JOIN MenuItems mi ON oi.menu_item_id = mi.menu_item_id
      WHERE s.vendor_id = @vendor_id
      GROUP BY mi.item_name
      ORDER BY SUM(oi.quantity) DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getDashboardMetrics,
  getRecentOrders,
  getWeeklyRevenue,
  getMonthlyRevenue,
  getTopSellingDishes
};
