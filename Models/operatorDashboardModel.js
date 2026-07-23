const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function getDashboardMetrics() {
  let pool;

  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();

    const financialQuery = pool.request().query(`
      SELECT
        CAST(ISNULL(SUM(CASE WHEN order_status = 'Completed' THEN total_amount ELSE 0 END), 0) AS DECIMAL(12, 2)) AS total_revenue,
        COUNT(*) AS total_orders,
        ISNULL(SUM(CASE WHEN order_status = 'Completed' THEN 1 ELSE 0 END), 0) AS completed_orders
      FROM Orders;
    `);

    const stallQuery = pool.request().query(`
      SELECT
        COUNT(*) AS total_stalls,
        ISNULL(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS active_stalls,
        ISNULL(SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END), 0) AS inactive_stalls
      FROM Stalls;
    `);

    const rentalQuery = pool.request().query(`
      IF OBJECT_ID('dbo.RentalAgreements', 'U') IS NULL
      BEGIN
        SELECT CAST(0 AS INT) AS active_agreements,
               CAST(0 AS INT) AS expiring_leases,
               CAST(0 AS BIT) AS rental_data_available;
      END
      ELSE
      BEGIN
        SELECT
          ISNULL(SUM(CASE WHEN agreement_status = 'Active' THEN 1 ELSE 0 END), 0) AS active_agreements,
          ISNULL(SUM(CASE
            WHEN agreement_status = 'Active'
              AND lease_end_date >= CAST(GETDATE() AS DATE)
              AND lease_end_date < DATEADD(DAY, 30, CAST(GETDATE() AS DATE))
            THEN 1 ELSE 0
          END), 0) AS expiring_leases,
          CAST(1 AS BIT) AS rental_data_available
        FROM RentalAgreements;
      END
    `);

    const complaintQuery = pool.request().query(`
      SELECT ISNULL(SUM(CASE
        WHEN complaint_status IN ('Open', 'Acknowledged', 'In Progress')
        THEN 1 ELSE 0
      END), 0) AS pending_complaints
      FROM Complaints;
    `);

    const hygieneQuery = pool.request().query(`
      WITH LatestInspections AS (
        SELECT
          stall_id,
          hygiene_grade,
          ROW_NUMBER() OVER (
            PARTITION BY stall_id
            ORDER BY inspection_date DESC
          ) AS row_num
        FROM Inspections
        WHERE hygiene_grade IS NOT NULL
          AND inspection_status = 'Completed'
      )
      SELECT hygiene_grade, COUNT(*) AS stall_count
      FROM LatestInspections
      WHERE row_num = 1
      GROUP BY hygiene_grade
      ORDER BY hygiene_grade;
    `);

    const [financial, stalls, rentals, complaints, hygiene] = await Promise.all([
      financialQuery,
      stallQuery,
      rentalQuery,
      complaintQuery,
      hygieneQuery
    ]);

    return {
      financial: financial.recordset[0],
      stalls: stalls.recordset[0],
      rentals: rentals.recordset[0],
      complaints: complaints.recordset[0],
      hygieneGrades: hygiene.recordset
    };
  } catch (error) {
    console.error("Database error loading operator dashboard metrics:", error);
    throw error;
  } finally {
    if (pool) await pool.close();
  }
}

module.exports = { getDashboardMetrics };