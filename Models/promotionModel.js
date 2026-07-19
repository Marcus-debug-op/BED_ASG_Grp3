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

// BED-47: duplicates are only blocked "for their stall" - promo_code is now
// UNIQUE(stall_id, promo_code) in the schema (see migration 006), so this
// checks within the given stall only. Two different stalls can both run a
// "SAVE10" code. excludePromotionId lets an update skip flagging a
// promotion against its own existing code.
async function isCodeTaken(connection, stallId, promoCode, excludePromotionId) {
  const request = connection.request();
  request.input("stall_id", sql.Int, stallId);
  request.input("promo_code", sql.VarChar(50), promoCode);
  request.input("exclude_id", sql.Int, excludePromotionId || null);

  const result = await request.query(`
    SELECT promotion_id FROM Promotions
    WHERE stall_id = @stall_id
      AND promo_code = @promo_code
      AND (@exclude_id IS NULL OR promotion_id <> @exclude_id);
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
             start_date, end_date, is_active, min_spend_amount, max_redemptions, created_at
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
             p.start_date, p.end_date, p.is_active, p.min_spend_amount, p.max_redemptions, p.created_at
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
// code: "not_owner", "duplicate_code", or "created" with the new row.
async function createPromotion(stallId, vendorId, promo) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const owns = await stallBelongsToVendor(connection, stallId, vendorId);
    if (!owns) return { outcome: "not_owner" };

    if (await isCodeTaken(connection, stallId, promo.promo_code)) {
      return { outcome: "duplicate_code" };
    }

    const request = connection.request();
    request.input("stall_id", sql.Int, stallId);
    request.input("promo_code", sql.VarChar(50), promo.promo_code);
    request.input("description", sql.VarChar(255), promo.description || null);
    request.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    request.input("start_date", sql.Date, promo.start_date);
    request.input("end_date", sql.Date, promo.end_date);
    request.input("is_active", sql.Bit, promo.is_active === undefined ? 1 : promo.is_active);
    // "" and undefined both mean "no minimum" / "unlimited" - store as NULL.
    request.input("min_spend_amount", sql.Decimal(10, 2), promo.min_spend_amount || null);
    request.input("max_redemptions", sql.Int, promo.max_redemptions || null);

    const result = await request.query(`
      INSERT INTO Promotions
        (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active, min_spend_amount, max_redemptions)
      OUTPUT INSERTED.promotion_id, INSERTED.stall_id, INSERTED.promo_code, INSERTED.description,
             INSERTED.discount_percent, INSERTED.start_date, INSERTED.end_date, INSERTED.is_active,
             INSERTED.min_spend_amount, INSERTED.max_redemptions, INSERTED.created_at
      VALUES
        (@stall_id, @promo_code, @description, @discount_percent, @start_date, @end_date, @is_active, @min_spend_amount, @max_redemptions);
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
// Returns a discriminated outcome: "not_found", "duplicate_code", or
// "updated" with the new row.
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

    if (await isCodeTaken(connection, existing.stall_id, promo.promo_code, promotionId)) {
      return { outcome: "duplicate_code" };
    }

    const updateRequest = connection.request();
    updateRequest.input("promotion_id", sql.Int, promotionId);
    updateRequest.input("promo_code", sql.VarChar(50), promo.promo_code);
    updateRequest.input("description", sql.VarChar(255), promo.description || null);
    updateRequest.input("discount_percent", sql.Decimal(5, 2), promo.discount_percent);
    updateRequest.input("start_date", sql.Date, promo.start_date);
    updateRequest.input("end_date", sql.Date, promo.end_date);
    updateRequest.input("is_active", sql.Bit, promo.is_active === undefined ? 1 : promo.is_active);
    updateRequest.input("min_spend_amount", sql.Decimal(10, 2), promo.min_spend_amount || null);
    updateRequest.input("max_redemptions", sql.Int, promo.max_redemptions || null);

    const updateResult = await updateRequest.query(`
      UPDATE Promotions
      SET promo_code = @promo_code,
          description = @description,
          discount_percent = @discount_percent,
          start_date = @start_date,
          end_date = @end_date,
          is_active = @is_active,
          min_spend_amount = @min_spend_amount,
          max_redemptions = @max_redemptions
      OUTPUT INSERTED.promotion_id, INSERTED.stall_id, INSERTED.promo_code, INSERTED.description,
             INSERTED.discount_percent, INSERTED.start_date, INSERTED.end_date, INSERTED.is_active,
             INSERTED.min_spend_amount, INSERTED.max_redemptions, INSERTED.created_at
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

// Deletes a promotion, but ONLY if it was never actually used - i.e. no
// order was ever placed with it and no redemption was ever recorded.
// This keeps BED-47's "never delete historical data" requirement intact:
// a promo a vendor created by mistake and never used can be removed
// outright, but the moment a patron has redeemed it, it can only be
// deactivated (via updatePromotion), never deleted - deleting it would
// also violate the FK from Orders/PromotionRedemptions -> Promotions.
// Returns a discriminated outcome: "not_found", "not_owner", "in_use", or "deleted".
async function deletePromotion(promotionId, vendorId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const ownershipRequest = connection.request();
    ownershipRequest.input("promotion_id", sql.Int, promotionId);

    const ownershipResult = await ownershipRequest.query(`
      SELECT p.stall_id, s.vendor_id
      FROM Promotions p
      INNER JOIN Stalls s ON p.stall_id = s.stall_id
      WHERE p.promotion_id = @promotion_id;
    `);

    const existing = ownershipResult.recordset[0];
    if (!existing) return { outcome: "not_found" };
    if (existing.vendor_id !== vendorId) return { outcome: "not_owner" };

    const usageRequest = connection.request();
    usageRequest.input("promotion_id", sql.Int, promotionId);

    const usageResult = await usageRequest.query(`
      SELECT
        (SELECT COUNT(*) FROM Orders WHERE promotion_id = @promotion_id) +
        (SELECT COUNT(*) FROM PromotionRedemptions WHERE promotion_id = @promotion_id)
        AS usage_count;
    `);

    if (usageResult.recordset[0].usage_count > 0) {
      return { outcome: "in_use" };
    }

    const deleteRequest = connection.request();
    deleteRequest.input("promotion_id", sql.Int, promotionId);

    await deleteRequest.query(`
      DELETE FROM Promotions WHERE promotion_id = @promotion_id;
    `);

    return { outcome: "deleted" };
  } catch (error) {
    // Safety net: a race where an order/redemption lands between the usage
    // check above and the DELETE itself - the FK constraint blocks it.
    if (error.number === 547) {
      return { outcome: "in_use" };
    }
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

// ---------------------------------------------------------------------
// Checkout-time validation (used by Models/orderModel.js during checkout).
// Runs on the SAME transaction the order is being created in, so an order
// and its promo redemption always succeed or fail together.
// ---------------------------------------------------------------------

// Returns a discriminated result:
//   { valid: false, reason: "...", message: "..." }   - specific, user-facing
//   { valid: true, promotionId, discountAmount, discountedTotal }
// subtotal is the pre-discount order total, calculated server-side by the
// caller from real menu item prices - never trust a client-supplied total.
//
// `holder` is whatever a sql.Request can be built from - either an active
// Transaction (checkout, BED-22/BED-46) or a plain ConnectionPool (preview).
// This is a pure read: it never writes anything, so it's safe to reuse for
// a checkout-page "Apply" preview that must NOT record a redemption before
// the order is actually submitted.
async function checkPromotionEligibility(holder, stallId, patronId, promoCode, subtotal) {
  const promoRequest = new sql.Request(holder);
  promoRequest.input("promo_code", sql.VarChar(50), promoCode);
  promoRequest.input("stall_id", sql.Int, stallId);

  const promoResult = await promoRequest.query(`
    SELECT promotion_id, discount_percent, start_date, end_date, is_active,
           min_spend_amount, max_redemptions
    FROM Promotions
    WHERE promo_code = @promo_code AND stall_id = @stall_id;
  `);
  
  

  const promo = promoResult.recordset[0];

  if (!promo) {
    return { valid: false, reason: "NOT_FOUND", message: "This promo code isn't valid for this stall." };
  }

  if (!promo.is_active) {
    return { valid: false, reason: "INACTIVE", message: "This promo code is no longer active." };
  }

  // Promotions.start_date/end_date are SQL Server DATE columns, which the
  // driver returns as UTC-midnight JS Dates (e.g. "2026-07-19" ->
  // 2026-07-19T00:00:00.000Z), with no timezone attached. Building "today"
  // from setHours(0,0,0,0) instead produces LOCAL midnight - for any
  // timezone ahead of UTC (e.g. Singapore, UTC+8), that's several hours
  // BEFORE UTC midnight of the same calendar date, so a promo starting
  // "today" would incorrectly compare as not-yet-started. Using today's
  // local calendar date but building it as a UTC-midnight Date keeps this
  // an apples-to-apples DATE comparison against the DB values.
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (today < new Date(promo.start_date) || today > new Date(promo.end_date)) {
    return { valid: false, reason: "EXPIRED", message: "This promo code isn't valid today - check its date range." };
  }

  if (promo.min_spend_amount && subtotal < promo.min_spend_amount) {
    return {
      valid: false,
      reason: "MIN_SPEND_NOT_MET",
      message: `This code needs a minimum spend of $${Number(promo.min_spend_amount).toFixed(2)} (your order is $${subtotal.toFixed(2)}).`
    };
  }

  const patronRequest = new sql.Request(holder);
  patronRequest.input("promotion_id", sql.Int, promo.promotion_id);
  patronRequest.input("patron_id", sql.Int, patronId);

  const patronUseResult = await patronRequest.query(`
    SELECT redemption_id FROM PromotionRedemptions
    WHERE promotion_id = @promotion_id AND patron_id = @patron_id;
  `);

  if (patronUseResult.recordset.length > 0) {
    return { valid: false, reason: "ALREADY_REDEEMED", message: "You've already used this promo code before." };
  }

  if (promo.max_redemptions !== null) {
    const countRequest = new sql.Request(holder);
    countRequest.input("promotion_id", sql.Int, promo.promotion_id);

    const countResult = await countRequest.query(`
      SELECT COUNT(*) AS used_count FROM PromotionRedemptions WHERE promotion_id = @promotion_id;
    `);

    if (countResult.recordset[0].used_count >= promo.max_redemptions) {
      return { valid: false, reason: "LIMIT_REACHED", message: "This promo code has reached its usage limit." };
    }
  }

  // Server-side discount math - the only place the actual discount amount is
  // ever calculated. A client can send whatever it wants; only this number counts.
  const discountAmount = Math.round(subtotal * (promo.discount_percent / 100) * 100) / 100;
  const discountedTotal = Math.round((subtotal - discountAmount) * 100) / 100;

  return { valid: true, promotionId: promo.promotion_id, discountAmount, discountedTotal };
}

// Used by Models/orderModel.js while actually creating an order (BED-22 /
// BED-46) - runs on the SAME transaction the order is being created in, so
// an order and its promo redemption always succeed or fail together.
async function validateAndApplyPromotion(transaction, stallId, patronId, promoCode, subtotal) {
  return checkPromotionEligibility(transaction, stallId, patronId, promoCode, subtotal);
}

// Checkout-page "Apply" preview (BED-92) - runs the exact same checks as a
// real checkout (so the number shown never lies), but on its own plain
// connection instead of the order's transaction. Nothing is written, so a
// patron can preview a code as many times as they like without it ever
// being marked as redeemed until they actually submit the order.
async function previewPromotion(connection, stallId, patronId, promoCode, subtotal) {
  return checkPromotionEligibility(connection, stallId, patronId, promoCode, subtotal);
}

// Logs a redemption row on the same transaction as the order that used it.
async function recordRedemption(transaction, promotionId, orderId, patronId, discountAmount) {
  const request = new sql.Request(transaction);
  request.input("promotion_id", sql.Int, promotionId);
  request.input("order_id", sql.Int, orderId);
  request.input("patron_id", sql.Int, patronId);
  request.input("discount_amount", sql.Decimal(10, 2), discountAmount);

  await request.query(`
    INSERT INTO PromotionRedemptions (promotion_id, order_id, patron_id, discount_amount)
    VALUES (@promotion_id, @order_id, @patron_id, @discount_amount);
  `);
}


module.exports = {
  getPromotionsByStall,
  getPromotionByIdForVendor,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validateAndApplyPromotion,
  previewPromotion,
  recordRedemption
};