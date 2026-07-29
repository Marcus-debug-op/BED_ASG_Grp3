const request = require("supertest");
const sql = require("mssql");
const app = require("../../app");
const dbConfig = require("../../dbConfig");
const {
  getOperatorToken,
  getVendorToken,
  getPatronToken
} = require("../testHelpers");

describe("Operator Dashboard API Tests", () => {
  let operatorToken;
  let vendorToken;
  let patronToken;

  beforeAll(async () => {
    [operatorToken, vendorToken, patronToken] = await Promise.all([
      getOperatorToken(),
      getVendorToken(),
      getPatronToken()
    ]);
  });

  test("allows an operator to retrieve centre-wide metrics", async () => {
    const response = await request(app)
      .get("/api/operator/dashboard/metrics")
      .set("Authorization", `Bearer ${operatorToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual(expect.objectContaining({
      financialMetrics: expect.any(Object),
      stallMetrics: expect.any(Object),
      rentalMetrics: expect.any(Object),
      complaintMetrics: expect.any(Object),
      hygieneMetrics: expect.any(Object)
    }));

    expect(response.body.financialMetrics.totalRevenue).toEqual(expect.any(Number));
    expect(response.body.financialMetrics.totalOrders).toEqual(expect.any(Number));
    expect(response.body.stallMetrics.activeStalls).toEqual(expect.any(Number));
    expect(response.body.complaintMetrics.pendingComplaints).toEqual(expect.any(Number));
    expect(response.body.hygieneMetrics.grades).toEqual(expect.any(Array));
  });

  test("matches completed-order revenue and total order count in SQL Server", async () => {
    const pool = await new sql.ConnectionPool(dbConfig).connect();

    try {
      const expected = await pool.request().query(`
        SELECT
          CAST(
            ISNULL(
              SUM(
                CASE
                  WHEN order_status = 'Completed'
                  THEN total_amount
                  ELSE 0
                END
              ),
              0
            ) AS DECIMAL(12, 2)
          ) AS total_revenue,
          COUNT(*) AS total_orders
        FROM Orders;
      `);

      const response = await request(app)
        .get("/api/operator/dashboard")
        .set("Authorization", `Bearer ${operatorToken}`);

      expect(response.statusCode).toBe(200);

      expect(response.body.financialMetrics.totalRevenue)
        .toBe(Number(expected.recordset[0].total_revenue));

      expect(response.body.financialMetrics.totalOrders)
        .toBe(Number(expected.recordset[0].total_orders));
    } finally {
      await pool.close();
    }
  });

  test("rejects a request without a token", async () => {
    const response = await request(app)
      .get("/api/operator/dashboard/metrics");

    expect(response.statusCode).toBe(401);
  });

  test("rejects a vendor from accessing operator metrics", async () => {
    const response = await request(app)
      .get("/api/operator/dashboard/metrics")
      .set("Authorization", `Bearer ${vendorToken}`);

    expect(response.statusCode).toBe(403);
  });

  test("rejects a patron from accessing operator metrics", async () => {
    const response = await request(app)
      .get("/api/operator/dashboard/metrics")
      .set("Authorization", `Bearer ${patronToken}`);

    expect(response.statusCode).toBe(403);
  });
});