const sql = require("mssql");
const dbConfig = require("../dbConfig");

// Public stall listing API.
// Supports search/filtering and also returns vendor name + current hygiene grade
// so patron, officer, and vendor pages can display stall details consistently.
async function getAllStalls(filters = {}) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);   
    const request = connection.request();

    let sqlQuery = `
  SELECT s.stall_id, s.stall_name,c.cuisine_name AS cuisine_type,s.description,s.unit_number,s.operating_hours,s.price_range,s.phone_number,s.image_url,s.current_hygiene_grade,h.hawker_centre_id,h.centre_name,h.area,u.full_name AS vendor_name FROM Stalls s
  INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
  INNER JOIN Users u ON s.vendor_id = u.user_id
  INNER JOIN Cuisines c ON s.cuisine_id = c.cuisine_id
  WHERE s.is_active = 1`;


    if (filters.search) {
      sqlQuery += ` AND (s.stall_name LIKE @search OR s.description LIKE @search)`;
      request.input("search", sql.NVarChar, `%${filters.search}%`);
    }

    if (filters.cuisine) {
      sqlQuery += ` AND c.cuisine_name = @cuisine`;
      request.input("cuisine", sql.NVarChar, filters.cuisine);
    }

    if (filters.hawkerCentreId) {
      sqlQuery += ` AND s.hawker_centre_id = @hawkerCentreId`;
      request.input("hawkerCentreId", sql.Int, filters.hawkerCentreId);
    }

    sqlQuery += ` ORDER BY s.stall_name;`;

    const result = await request.query(sqlQuery);
    return result.recordset;
  }

  catch (error) {
    console.error("Database error:", error);
    throw error;
  }

  finally {
    if (connection) {
      await connection.close();
    }
  }
}

// BED-62: Menu Display API
// Returns null if the stall doesn't exist / isn't active, so the controller can 404.
async function getMenuByStallId(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const stallRequest = connection.request();
    stallRequest.input("stall_id", sql.Int, stallId);

    const stallResult = await stallRequest.query(`
      SELECT s.stall_id, s.stall_name, c.cuisine_name AS cuisine_type, s.description, s.unit_number, h.centre_name
      FROM Stalls s
      INNER JOIN HawkerCentres h ON s.hawker_centre_id = h.hawker_centre_id
      INNER JOIN Cuisines c ON s.cuisine_id = c.cuisine_id
      WHERE s.stall_id = @stall_id AND s.is_active = 1;
    `);

    if (stallResult.recordset.length === 0) {
      return null;
    }

    const menuRequest = connection.request();
    menuRequest.input("stall_id", sql.Int, stallId);

    const menuResult = await menuRequest.query(`
      SELECT menu_item_id, item_name, description, price, category, image_url, is_available, likes 
      FROM MenuItems
      WHERE stall_id = @stall_id AND is_available = 1
      ORDER BY category, item_name;
    `);

    return {
      stall: stallResult.recordset[0],
      menu_items: menuResult.recordset
    };
  }

  catch (error) {
    console.error("Database error:", error);
    throw error;
  }

  finally {
    if (connection) {
      await connection.close();
    }
  }
}

// BED-85: Public reviews summary API - no auth needed, just an existing stall.
// Returns null if the stall doesn't exist, so the controller can 404.
async function getStallReviewsSummary(stallId) {
  let connection;

  try {
    connection = await sql.connect(dbConfig);

    const stallRequest = connection.request();
    stallRequest.input("stall_id", sql.Int, stallId);

    const stallResult = await stallRequest.query(`
      SELECT stall_id FROM Stalls WHERE stall_id = @stall_id AND is_active = 1;
    `);

    if (stallResult.recordset.length === 0) {
      return null;
    }

    const statsRequest = connection.request();
    statsRequest.input("stall_id", sql.Int, stallId);

    const statsResult = await statsRequest.query(`
      SELECT AVG(CAST(rating AS FLOAT)) AS avg_rating, COUNT(*) AS total_reviews
      FROM Feedbacks
      WHERE stall_id = @stall_id;
    `);

    const recentRequest = connection.request();
    recentRequest.input("stall_id", sql.Int, stallId);

    const recentResult = await recentRequest.query(`
      SELECT TOP (5) f.feedback_id, f.patron_id, f.rating, f.comment, f.created_at, u.full_name AS reviewer_name
      FROM Feedbacks f
      INNER JOIN Users u ON f.patron_id = u.user_id
      WHERE f.stall_id = @stall_id
      ORDER BY f.created_at DESC;
    `);

    // AVG() over zero rows returns SQL NULL - that's exactly the avg_rating: null
    // empty state the ticket wants, so it's passed through as-is, not coerced to 0.
    return {
      avg_rating: statsResult.recordset[0].avg_rating,
      total_reviews: statsResult.recordset[0].total_reviews,
      recent_reviews: recentResult.recordset
    };
  } catch (error) {
    console.error("Database error:", error);
    throw error;
  } finally {
    if (connection) await connection.close();
  }
}

module.exports = {
  getAllStalls,
  getMenuByStallId,
  getStallReviewsSummary
};