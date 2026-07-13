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
      ORDER BY created_at DESC;
    `);

    return result.recordset;
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function createPromotion(stallId, vendorId, promo) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return null;

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("promo_code", sql.VarChar(50), promo.promo_code);
    request.input("description", sql.VarChar(255), promo.description || null);
    request.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    request.input("start_date", sql.Date, promo.start_date);
    request.input("end_date", sql.Date, promo.end_date);
    request.input("is_active", sql.Bit, promo.is_active === undefined ? 1 : promo.is_active);

    try {
      const result = await request.query(`
        INSERT INTO Promotions (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active)
        OUTPUT INSERTED.promotion_id, INSERTED.stall_id, INSERTED.promo_code, INSERTED.description,
               INSERTED.discount_percent, INSERTED.start_date, INSERTED.end_date, INSERTED.is_active, INSERTED.created_at
        VALUES (@stall_id, @promo_code, @description, @discount_percent, @start_date, @end_date, @is_active);
      `);

      return result.recordset[0];
    } catch (error) {
      // UNIQUE constraint violation on promo_code.
      if (error.number === 2627 || error.number === 2601) {
        return { error: "DUPLICATE_CODE" };
      }
      throw error;
    }
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// Returns null if the promotion doesn't exist or doesn't belong to this vendor's stalls.
async function updatePromotion(promotionId, vendorId, promo) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("promotion_id", sql.Int, promotionId);
    request.input("vendor_id", sql.Int, vendorId);
    request.input("promo_code", sql.VarChar(50), promo.promo_code);
    request.input("description", sql.VarChar(255), promo.description || null);
    request.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    request.input("start_date", sql.Date, promo.start_date);
    request.input("end_date", sql.Date, promo.end_date);
    request.input("is_active", sql.Bit, promo.is_active === undefined ? 1 : promo.is_active);

    try {
      const result = await request.query(`
        UPDATE p
        SET promo_code = @promo_code,
            description = @description,
            discount_percent = @discount_percent,
            start_date = @start_date,
            end_date = @end_date,
            is_active = @is_active
        OUTPUT INSERTED.promotion_id, INSERTED.stall_id, INSERTED.promo_code, INSERTED.description,
               INSERTED.discount_percent, INSERTED.start_date, INSERTED.end_date, INSERTED.is_active, INSERTED.created_at
        FROM Promotions p
        INNER JOIN Stalls s ON p.stall_id = s.stall_id
        WHERE p.promotion_id = @promotion_id AND s.vendor_id = @vendor_id;
      `);

      return result.recordset[0] || null;
    } catch (error) {
      if (error.number === 2627 || error.number === 2601) {
        return { error: "DUPLICATE_CODE" };
      }
      throw error;
    }
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

async function setPromotionActive(promotionId, vendorId, isActive) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("promotion_id", sql.Int, promotionId);
    request.input("vendor_id", sql.Int, vendorId);
    request.input("is_active", sql.Bit, isActive);

    const result = await request.query(`
      UPDATE p
      SET is_active = @is_active
      OUTPUT INSERTED.promotion_id, INSERTED.is_active
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

async function deletePromotion(promotionId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const request = connection.request();
    request.input("promotion_id", sql.Int, promotionId);
    request.input("vendor_id", sql.Int, vendorId);

    const result = await request.query(`
      DELETE p
      OUTPUT DELETED.promotion_id
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

module.exports = {
  getPromotionsByStall,
  createPromotion,
  updatePromotion,
  setPromotionActive,
  deletePromotion
};
