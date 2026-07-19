-- =====================================================================
-- Demo/fake data for vendor presentation
-- Vendor: marcusisavendor@gmail.com (user_id 1)
-- Safe to re-run: skips inserts that already exist instead of duplicating.
-- Run this in SSMS with HawkerDB selected.
-- =====================================================================

USE HawkerDB;
GO

DECLARE @vendor_id INT = 1;
DECLARE @stall_id INT;
DECLARE @hawker_centre_id INT;
DECLARE @patron1_id INT = 3; -- Marcus Ng
DECLARE @patron2_id INT = 4; -- FixitFelix

-- ---------------------------------------------------------------------
-- 1. Stall (only creates one if this vendor doesn't already have one)
-- ---------------------------------------------------------------------

SELECT @hawker_centre_id = hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre';

IF NOT EXISTS (SELECT 1 FROM Stalls WHERE vendor_id = @vendor_id)
BEGIN
    INSERT INTO Stalls (vendor_id, stall_name, cuisine_type, description, unit_number, is_active, hawker_centre_id)
    VALUES (@vendor_id, 'Marcus Beancurd House', 'Chinese', 'Silky homemade beancurd and dessert soups since day one.', '#01-88', 1, @hawker_centre_id);
END

SELECT @stall_id = stall_id FROM Stalls WHERE vendor_id = @vendor_id;

-- ---------------------------------------------------------------------
-- 2. Menu items
-- ---------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Silky Beancurd (Hot)')
    INSERT INTO MenuItems (stall_id, item_name, description, price, category, is_available)
    VALUES (@stall_id, 'Silky Beancurd (Hot)', 'Smooth steamed beancurd served warm with ginger syrup.', 2.50, 'Beancurd', 1);

IF NOT EXISTS (SELECT 1 FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Silky Beancurd (Cold)')
    INSERT INTO MenuItems (stall_id, item_name, description, price, category, is_available)
    VALUES (@stall_id, 'Silky Beancurd (Cold)', 'Chilled beancurd with brown sugar syrup, extra smooth.', 2.50, 'Beancurd', 1);

IF NOT EXISTS (SELECT 1 FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Beancurd with Grass Jelly')
    INSERT INTO MenuItems (stall_id, item_name, description, price, category, is_available)
    VALUES (@stall_id, 'Beancurd with Grass Jelly', 'Classic combo of silky beancurd and house-made grass jelly.', 3.20, 'Beancurd', 1);

IF NOT EXISTS (SELECT 1 FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Soy Milk')
    INSERT INTO MenuItems (stall_id, item_name, description, price, category, is_available)
    VALUES (@stall_id, 'Soy Milk', 'Freshly ground, lightly sweetened soy milk.', 1.80, 'Drinks', 1);

IF NOT EXISTS (SELECT 1 FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Beancurd Skin Roll')
    INSERT INTO MenuItems (stall_id, item_name, description, price, category, is_available)
    VALUES (@stall_id, 'Beancurd Skin Roll', 'Limited-batch item, shows the "Unavailable" state on Menu.', 4.00, 'Beancurd', 0);

-- ---------------------------------------------------------------------
-- 3. Promotions
-- ---------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM Promotions WHERE stall_id = @stall_id AND promo_code = 'WELCOME10')
    INSERT INTO Promotions (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active)
    VALUES (@stall_id, 'WELCOME10', '10% off your first order', 10.00, CAST(GETDATE() AS DATE), DATEADD(DAY, 30, CAST(GETDATE() AS DATE)), 1);

IF NOT EXISTS (SELECT 1 FROM Promotions WHERE stall_id = @stall_id AND promo_code = 'BEANCURD20')
    INSERT INTO Promotions (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active)
    VALUES (@stall_id, 'BEANCURD20', '20% off orders above $8', 20.00, CAST(GETDATE() AS DATE), DATEADD(DAY, 14, CAST(GETDATE() AS DATE)), 1);

-- ---------------------------------------------------------------------
-- 4. Orders (mix of statuses + dates, so the dashboard/order list look real)
-- ---------------------------------------------------------------------

DECLARE @item1 INT, @item2 INT, @item3 INT, @item4 INT;

SELECT @item1 = menu_item_id FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Silky Beancurd (Hot)';
SELECT @item2 = menu_item_id FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Silky Beancurd (Cold)';
SELECT @item3 = menu_item_id FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Beancurd with Grass Jelly';
SELECT @item4 = menu_item_id FROM MenuItems WHERE stall_id = @stall_id AND item_name = 'Soy Milk';

-- Only seed orders once (skip if this stall already has demo orders)
IF NOT EXISTS (SELECT 1 FROM Orders WHERE stall_id = @stall_id)
BEGIN
    DECLARE @orderId INT;

    -- Order 1: today, Pending
    INSERT INTO Orders (patron_id, stall_id, order_status, total_amount, order_date)
    VALUES (@patron1_id, @stall_id, 'Pending', 6.80, GETDATE());
    SET @orderId = SCOPE_IDENTITY();
    INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
        (@orderId, @item1, 1, 2.50, 2.50),
        (@orderId, @item2, 1, 2.50, 2.50),
        (@orderId, @item4, 1, 1.80, 1.80);

    -- Order 2: today, Preparing
    INSERT INTO Orders (patron_id, stall_id, order_status, total_amount, order_date)
    VALUES (@patron2_id, @stall_id, 'Preparing', 3.20, GETDATE());
    SET @orderId = SCOPE_IDENTITY();
    INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
        (@orderId, @item3, 1, 3.20, 3.20);

    -- Order 3: today, Ready
    INSERT INTO Orders (patron_id, stall_id, order_status, total_amount, order_date)
    VALUES (@patron1_id, @stall_id, 'Ready', 2.50, GETDATE());
    SET @orderId = SCOPE_IDENTITY();
    INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
        (@orderId, @item1, 1, 2.50, 2.50);

    -- Order 4: today, Completed
    INSERT INTO Orders (patron_id, stall_id, order_status, total_amount, order_date)
    VALUES (@patron2_id, @stall_id, 'Completed', 5.00, GETDATE());
    SET @orderId = SCOPE_IDENTITY();
    INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
        (@orderId, @item2, 2, 2.50, 5.00);

    -- Order 5: yesterday, Completed (adds order history without inflating "today" numbers)
    INSERT INTO Orders (patron_id, stall_id, order_status, total_amount, order_date)
    VALUES (@patron1_id, @stall_id, 'Completed', 5.00, DATEADD(DAY, -1, GETDATE()));
    SET @orderId = SCOPE_IDENTITY();
    INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
        (@orderId, @item3, 1, 3.20, 3.20),
        (@orderId, @item4, 1, 1.80, 1.80);

    -- Order 6: 3 days ago, Completed
    INSERT INTO Orders (patron_id, stall_id, order_status, total_amount, order_date)
    VALUES (@patron2_id, @stall_id, 'Completed', 2.50, DATEADD(DAY, -3, GETDATE()));
    SET @orderId = SCOPE_IDENTITY();
    INSERT INTO OrderItems (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES
        (@orderId, @item1, 1, 2.50, 2.50);
END

-- ---------------------------------------------------------------------
-- 5. Feedback (so "Average Rating" on the dashboard shows a real number)
-- ---------------------------------------------------------------------

IF NOT EXISTS (SELECT 1 FROM Feedbacks WHERE stall_id = @stall_id)
BEGIN
    INSERT INTO Feedbacks (patron_id, stall_id, rating, comment) VALUES
        (@patron1_id, @stall_id, 5, 'Silkiest beancurd in the whole hawker centre!'),
        (@patron2_id, @stall_id, 4, 'Great taste, a bit of a wait during lunch rush.');
END

-- ---------------------------------------------------------------------
-- Quick check - see everything that just went in
-- ---------------------------------------------------------------------

SELECT * FROM Stalls WHERE vendor_id = @vendor_id;
SELECT * FROM MenuItems WHERE stall_id = @stall_id;
SELECT * FROM Promotions WHERE stall_id = @stall_id;
SELECT * FROM Orders WHERE stall_id = @stall_id ORDER BY order_date DESC;
SELECT * FROM Feedbacks WHERE stall_id = @stall_id;
