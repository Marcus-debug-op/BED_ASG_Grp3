const sql = require("mssql");
const dbConfig = require("../dbConfig");

async function stallExists(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      SELECT stall_id
      FROM Stalls
      WHERE stall_id = @stall_id
        AND is_active = 1;
    `);

    return result.recordset.length > 0;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function scheduleInspection(stallId, officerId, inspectionDate) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("officer_id", sql.Int, officerId);
    request.input("inspection_date", sql.DateTime, inspectionDate);

    const result = await request.query(`
      INSERT INTO Inspections
        (stall_id, officer_id, inspection_date, inspection_status)
      OUTPUT
        INSERTED.inspection_id,
        INSERTED.stall_id,
        INSERTED.officer_id,
        INSERTED.inspection_date,
        INSERTED.inspection_status
      VALUES
        (@stall_id, @officer_id, @inspection_date, 'Scheduled');
    `);

    return result.recordset[0];
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function getUpcomingScheduledInspections(officerId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("officer_id", sql.Int, officerId);

    const result = await request.query(`
      SELECT
        i.inspection_id,
        i.stall_id,
        s.stall_name,
        h.centre_name,
        i.officer_id,
        u.full_name AS officer_name,
        i.inspection_date,
        i.inspection_status
      FROM Inspections i
      INNER JOIN Stalls s ON i.stall_id = s.stall_id
      INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
      INNER JOIN Users u ON i.officer_id = u.user_id
      WHERE i.officer_id = @officer_id
        AND i.inspection_status = 'Scheduled'
        AND i.inspection_date >= GETDATE()
      ORDER BY i.inspection_date ASC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function rescheduleInspection(inspectionId, officerId, inspectionDate) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("inspection_id", sql.Int, inspectionId);
    request.input("officer_id", sql.Int, officerId);
    request.input("inspection_date", sql.DateTime, inspectionDate);

    const result = await request.query(`
      UPDATE Inspections
      SET inspection_date = @inspection_date
      OUTPUT
        INSERTED.inspection_id,
        INSERTED.stall_id,
        INSERTED.officer_id,
        INSERTED.inspection_date,
        INSERTED.inspection_status
      WHERE inspection_id = @inspection_id
        AND officer_id = @officer_id
        AND inspection_status = 'Scheduled';
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function cancelInspection(inspectionId, officerId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("inspection_id", sql.Int, inspectionId);
    request.input("officer_id", sql.Int, officerId);

    const result = await request.query(`
      UPDATE Inspections
      SET inspection_status = 'Cancelled'
      OUTPUT
        INSERTED.inspection_id,
        INSERTED.stall_id,
        INSERTED.officer_id,
        INSERTED.inspection_date,
        INSERTED.inspection_status
      WHERE inspection_id = @inspection_id
        AND officer_id = @officer_id
        AND inspection_status = 'Scheduled';
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  stallExists,
  scheduleInspection,
  getUpcomingScheduledInspections,
  rescheduleInspection,
  cancelInspection
};