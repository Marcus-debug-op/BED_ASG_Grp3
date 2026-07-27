const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function getAnalytics() {
  let pool;

  try {
    pool = await new sql.ConnectionPool(dbConfig).connect();

    const gradeDistributionQuery = pool.request().query(`
      WITH GradeBuckets AS (
        SELECT grade FROM (VALUES ('A'), ('B'), ('C'), ('D')) AS Grades(grade)
      )
      SELECT
        b.grade,
        COUNT(i.inspection_id) AS inspection_count
      FROM GradeBuckets b
      LEFT JOIN Inspections i
        ON i.hygiene_grade = b.grade
        AND i.inspection_status = 'Completed'
      GROUP BY b.grade
      ORDER BY b.grade;
    `);

    const monthlyTrendsQuery = pool.request().query(`
      SELECT
        CONVERT(CHAR(7), inspection_date, 126) AS month,
        COUNT(*) AS inspection_count
      FROM Inspections
      WHERE inspection_status = 'Completed'
      GROUP BY
        YEAR(inspection_date),
        MONTH(inspection_date),
        CONVERT(CHAR(7), inspection_date, 126)
      ORDER BY YEAR(inspection_date), MONTH(inspection_date);
    `);

    const flaggedStallsQuery = pool.request().query(`
      WITH OrderedInspections AS (
        SELECT
          i.stall_id,
          s.stall_name,
          i.inspection_id,
          i.inspection_date,
          i.hygiene_grade,
          CASE
            WHEN i.hygiene_grade IN ('C', 'D') THEN 1
            ELSE 0
          END AS is_poor_grade
        FROM Inspections i
        INNER JOIN Stalls s ON s.stall_id = i.stall_id
        WHERE i.inspection_status = 'Completed'
          AND i.hygiene_grade IS NOT NULL
      ),
      GroupedInspections AS (
        SELECT *,
          SUM(CASE WHEN is_poor_grade = 0 THEN 1 ELSE 0 END) OVER (
            PARTITION BY stall_id
            ORDER BY inspection_date, inspection_id
            ROWS UNBOUNDED PRECEDING
          ) AS streak_group
        FROM OrderedInspections
      ),
      PoorStreaks AS (
        SELECT
          stall_id,
          stall_name,
          streak_group,
          COUNT(*) AS consecutive_poor_grades,
          MAX(inspection_date) AS latest_poor_inspection
        FROM GroupedInspections
        WHERE is_poor_grade = 1
        GROUP BY stall_id, stall_name, streak_group
      ),
      RankedStalls AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY stall_id
            ORDER BY consecutive_poor_grades DESC, latest_poor_inspection DESC
          ) AS streak_rank
        FROM PoorStreaks
      )
      SELECT TOP 5
        stall_id,
        stall_name,
        consecutive_poor_grades,
        latest_poor_inspection
      FROM RankedStalls
      WHERE streak_rank = 1
      ORDER BY consecutive_poor_grades DESC, latest_poor_inspection DESC;
    `);

    const [gradeDistribution, monthlyTrends, flaggedStalls] = await Promise.all([
      gradeDistributionQuery,
      monthlyTrendsQuery,
      flaggedStallsQuery
    ]);

    return {
      gradeDistribution: gradeDistribution.recordset,
      monthlyTrends: monthlyTrends.recordset,
      flaggedStalls: flaggedStalls.recordset
    };
  } catch (error) {
    console.error("Database error loading NEA inspection analytics:", error);
    throw error;
  } finally {
    if (pool) await pool.close();
  }
}

module.exports = { getAnalytics };