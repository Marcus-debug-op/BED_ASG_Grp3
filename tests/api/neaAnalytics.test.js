const request = require("supertest");
const sql = require("mssql");
const app = require("../../app");
const dbConfig = require("../../dbConfig");

const {
  getOfficerToken,
  getVendorToken,
  getPatronToken
} = require("../testHelpers");

describe("NEA Inspection Analytics API Tests", () => {
  let officerToken;
  let vendorToken;
  let patronToken;

  beforeAll(async () => {
    [officerToken, vendorToken, patronToken] = await Promise.all([
      getOfficerToken(),
      getVendorToken(),
      getPatronToken()
    ]);
  });

  test("allows an officer to retrieve analytics formatted for charts", async () => {
    const response = await request(app)
      .get("/api/nea/analytics")
      .set("Authorization", `Bearer ${officerToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual(expect.objectContaining({
      gradeDistribution: expect.any(Array),
      monthlyTrends: expect.any(Array),
      flaggedStalls: expect.any(Array)
    }));

    expect(response.body.gradeDistribution.map((row) => row.grade))
      .toEqual(["A", "B", "C", "D"]);
  });

  test("matches completed inspection grade totals in SQL Server", async () => {
    const pool = await new sql.ConnectionPool(dbConfig).connect();

    try {
      const expected = await pool.request().query(`
        SELECT hygiene_grade, COUNT(*) AS inspection_count
        FROM Inspections
        WHERE inspection_status = 'Completed'
          AND hygiene_grade IS NOT NULL
        GROUP BY hygiene_grade;
      `);

      const response = await request(app)
        .get("/api/nea/analytics")
        .set("Authorization", `Bearer ${officerToken}`);

      expect(response.statusCode).toBe(200);

      for (const row of expected.recordset) {
        const apiGrade = response.body.gradeDistribution.find(
          (grade) => grade.grade === row.hygiene_grade
        );

        expect(apiGrade.inspectionCount)
          .toBe(Number(row.inspection_count));
      }
    } finally {
      await pool.close();
    }
  });

  test("rejects a request without a token", async () => {
    const response = await request(app).get("/api/nea/analytics");

    expect(response.statusCode).toBe(401);
  });

  test("rejects a vendor from accessing NEA analytics", async () => {
    const response = await request(app)
      .get("/api/nea/analytics")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(403);
  });

  test("rejects a patron from accessing NEA analytics", async () => {
    const response = await request(app)
      .get("/api/nea/analytics")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
  });
});