const sql = require("mssql");
const dbConfig = require("../dbConfig");


// Used before scheduling to make sure the selected stall exists and is active.
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

// Insert a new inspection with default status Scheduled.
// officerId comes from the authenticated officer token.
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

// Load only upcoming Scheduled inspections for the officer's schedule page.
// Completed and Cancelled inspections are excluded from the active schedule.
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


// Only Scheduled inspections can be rescheduled.
// This prevents completed or cancelled records from being changed again.
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


// Soft delete: keep the inspection record for audit/history,
// but remove it from the active schedule by marking it as Cancelled.
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

// Completing an inspection affects two tables, so a transaction is used.
// Inspections stores the detailed result, while Stalls stores the latest hygiene grade.
async function completeInspectionResult(inspectionId,officerId,score,hygieneGrade,remarks,resultStatus) {
  let connection;
  let transaction;

  try {
    connection = await sql.connect(dbConfig);
    transaction = new sql.Transaction(connection);

    await transaction.begin();

    /*
      Step 1:
      Update the scheduled inspection with result details.
      Only the officer who scheduled the inspection can complete it.
      Only Scheduled inspections can be completed.
    */
    const inspectionRequest = new sql.Request(transaction);

    inspectionRequest.input("inspection_id", sql.Int, inspectionId);
    inspectionRequest.input("officer_id", sql.Int, officerId);
    inspectionRequest.input("score", sql.Int, score);
    inspectionRequest.input("hygiene_grade", sql.VarChar(5), hygieneGrade);
    inspectionRequest.input("remarks", sql.VarChar(500), remarks || null);
    inspectionRequest.input("result", sql.VarChar(50), resultStatus);

    // Store the latest grade on the stall so patron/vendor pages can display it quickly.
    const inspectionResult = await inspectionRequest.query(`
      UPDATE Inspections
      SET score = @score, hygiene_grade = @hygiene_grade, remarks = @remarks, result = @result, inspection_status = 'Completed', completed_at = GETDATE()
      OUTPUT
        INSERTED.inspection_id,
        INSERTED.stall_id,
        INSERTED.officer_id,
        INSERTED.inspection_date,
        INSERTED.inspection_status,
        INSERTED.score,
        INSERTED.hygiene_grade,
        INSERTED.remarks,
        INSERTED.result,
        INSERTED.completed_at
      WHERE inspection_id = @inspection_id
        AND officer_id = @officer_id
        AND inspection_status = 'Scheduled';
    `);

    const completedInspection = inspectionResult.recordset[0];

    if (!completedInspection) {
      await transaction.rollback();
      return null;
    }

    /*
      Step 2:
      Update the stall's latest hygiene grade.
      This keeps the stall record updated after inspection completion.
    */
    const stallRequest = new sql.Request(transaction);

    stallRequest.input("stall_id", sql.Int, completedInspection.stall_id);
    stallRequest.input("hygiene_grade", sql.VarChar(5), hygieneGrade);

    await stallRequest.query(`
      UPDATE Stalls
      SET current_hygiene_grade = @hygiene_grade
      WHERE stall_id = @stall_id;
    `);

    await transaction.commit();

    return completedInspection;
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError);
      }
    }

    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns inspection history/activity records.
// If stallId is provided, the results are filtered to one stall.
async function getInspectionRecords(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();

    let query = `
      SELECT
        i.inspection_id,
        i.stall_id,
        s.stall_name,
        h.centre_name,
        i.officer_id,
        u.full_name AS officer_name,
        i.inspection_date,
        i.inspection_status,
        i.score,
        i.hygiene_grade,
        i.remarks,
        i.result,
        i.completed_at
      FROM Inspections i
      INNER JOIN Stalls s ON i.stall_id = s.stall_id
      INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
      INNER JOIN Users u ON i.officer_id = u.user_id
      WHERE 1 = 1
    `;

    if (stallId) {
      query += ` AND i.stall_id = @stall_id`;
      request.input("stall_id", sql.Int, stallId);
    }

    query += ` ORDER BY i.inspection_date DESC;`;

    const result = await request.query(query);

    return result.recordset;
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
  cancelInspection,
  completeInspectionResult,
  getInspectionRecords,
};