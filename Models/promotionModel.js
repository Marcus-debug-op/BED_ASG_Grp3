const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Confirms the given stall belongs to the given vendor before any write/read happens.
async function stallBelongsToVendor(connection, stallId, vendorId) {
  const request = connection.request();
  request.input("stall_id", sql.Int, stallId);
  request.input("vendor_id", sql.Int, vendorId);

  const result = await request.query(`
    SELECT stall_id FROM Stalls WHERE stall_id = @stall_id AND vendor_id = @vendor_id;
  `);

  return result.recordset.length > 0;
}

// promo_code is globally UNIQUE in the schema (not just per-stall), so this
// checks across all vendors. excludePromotionId lets an update skip flagging
// a promotion against its own existing code.
async function isCodeTaken(connection, promoCode, excludePromotionId) {
  const request = connection.request();
  request.input("promo_code", sql.VarChar(50), promoCode);
  request.input("exclude_id", sql.Int, excludePromotionId || null);

  const result = await request.query(`
    SELECT promotion_id FROM Promotions
    WHERE promo_code = @promo_code
      AND (@exclude_id IS NULL OR promotion_id <> @exclude_id);
  `);

  return result.recordset.length > 0;
}

// A stall shouldn't run two active, overlapping promotions at once (confusing
// for patrons at checkout - which discount applies?). Two date ranges overlap
// when start_a <= end_b AND end_a >= start_b. excludePromotionId lets an
// update skip comparing a promotion against itself.
async function hasOverlappingActivePromotion(connection, stallId, startDate, endDate, excludePromotionId) {
  const request = connection.request();
  request.input("stall_id", sql.Int, stallId);
  request.input("start_date", sql.Date, startDate);
  request.input("end_date", sql.Date, endDate);
  request.input("exclude_id", sql.Int, excludePromotionId || null);

  const result = await request.query(`
    SELECT promotion_id FROM Promotions
    WHERE stall_id = @stall_id
      AND is_active = 1
      AND (@exclude_id IS NULL OR promotion_id <> @exclude_id)
      AND start_date <= @end_date
      AND end_date >= @start_date;
  `);

  return result.recordset.length > 0;
}

// Returns null if the stall doesn't belong to this vendor, so the controller can 403.
async function getPromotionsByStall(stallId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return null;

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);

    const result = await request.query(`
      SELECT promotion_id, stall_id, promo_code, description, discount_percent,
             start_date, end_date, is_active, created_at
      FROM Promotions
      WHERE stall_id = @stall_id
      ORDER BY start_date DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns null if the promotion doesn't exist or isn't on one of this vendor's stalls.
async function getPromotionByIdForVendor(promotionId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("promotion_id", sql.Int, promotionId);
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      SELECT p.promotion_id, p.stall_id, p.promo_code, p.description, p.discount_percent,
             p.start_date, p.end_date, p.is_active, p.created_at
      FROM Promotions p
      INNER JOIN Stalls s ON p.stall_id = s.stall_id
      WHERE p.promotion_id = @promotion_id AND s.vendor_id = @vendor_id;
    `);

    return result.recordset[0] || null;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns a discriminated outcome so the controller can pick the right status
// code: "not_owner", "duplicate_code", "date_overlap", or "created" with the new row.
async function createPromotion(stallId, vendorId, promo) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return { outcome: "not_owner" };

    if (await isCodeTaken(connection, promo.promo_code)) {
      return { outcome: "duplicate_code" };
    }

    if (await hasOverlappingActivePromotion(connection, stallId, promo.start_date, promo.end_date)) {
      return { outcome: "date_overlap" };
    }

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("promo_code", sql.VarChar(50), promo.promo_code);
    request.input("description", sql.VarChar(255), promo.description || null);
    request.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    request.input("start_date", sql.Date, promo.start_date);
    request.input("end_date", sql.Date, promo.end_date);
    request.input("is_active", sql.Bit, promo.is_active === undefined ? 1 : promo.is_active);

    const result = await request.query(`
      INSERT INTO Promotions (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active)
      OUTPUT INSERTED.promotion_id, INSERTED.stall_id, INSERTED.promo_code, INSERTED.description,
             INSERTED.discount_percent, INSERTED.start_date, INSERTED.end_date, INSERTED.is_active, INSERTED.created_at
      VALUES (@stall_id, @promo_code, @description, @discount_percent, @start_date, @end_date, @is_active);
    `);

    return { outcome: "created", promotion: result.recordset[0] };
  } catch (error) {
    // Safety net for a race condition slipping past the pre-check above.
    if (error.number === 2627 || error.number === 2601) {
      return { outcome: "duplicate_code" };
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Full update (including the "toggle it off" case via is_active) - never
// deletes the row, so historical promotion data (and any past orders that
// used it) stays intact.
// Returns a discriminated outcome: "not_found", "duplicate_code",
// "date_overlap", or "updated" with the new row.
async function updatePromotion(promotionId, vendorId, promo) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const ownershipRequest = connection.request();
    ownershipRequest.input("promotion_id", sql.Int, promotionId);
    ownershipRequest.input("vendor_id", sql.Int, vendorId);

    const ownershipResult = await ownershipRequest.query(`
      SELECT p.stall_id
      FROM Promotions p
      INNER JOIN Stalls s ON p.stall_id = s.stall_id
      WHERE p.promotion_id = @promotion_id AND s.vendor_id = @vendor_id;
    `);

    const existing = ownershipResult.recordset[0];
    if (!existing) return { outcome: "not_found" };

    if (await isCodeTaken(connection, promo.promo_code, promotionId)) {
      return { outcome: "duplicate_code" };
    }

    if (await hasOverlappingActivePromotion(connection, existing.stall_id, promo.start_date, promo.end_date, promotionId)) {
      return { outcome: "date_overlap" };
    }

    const updateRequest = connection.request();
    updateRequest.input("promotion_id", sql.Int, promotionId);
    updateRequest.input("promo_code", sql.VarChar(50), promo.promo_code);
    updateRequest.input("description", sql.VarChar(255), promo.description || null);
    updateRequest.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    updateRequest.input("start_date", sql.Date, promo.start_date);
    updateRequest.input("end_date", sql.Date, promo.end_date);
    updateRequest.input("is_active", sql.Bit, promo.is_active === undefined ? 1 : promo.is_active);

    const updateResult = await updateRequest.query(`
      UPDATE Promotions
      SET promo_code = @promo_code,
          description = @description,
          discount_percent = @discount_percent,
          start_date = @start_date,
          end_date = @end_date,
          is_active = @is_active
      OUTPUT INSERTED.promotion_id, INSERTED.stall_id, INSERTED.promo_code, INSERTED.description,
             INSERTED.discount_percent, INSERTED.start_date, INSERTED.end_date, INSERTED.is_active, INSERTED.created_at
      WHERE promotion_id = @promotion_id;
    `);

    return { outcome: "updated", promotion: updateResult.recordset[0] };
  } catch (error) {
    if (error.number === 2627 || error.number === 2601) {
      return { outcome: "duplicate_code" };
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getPromotionsByStall,
  getPromotionByIdForVendor,
  createPromotion,
  updatePromotion
};
