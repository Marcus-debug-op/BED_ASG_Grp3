-- =====================================================================
-- Seed data for Promotions, PromotionRedemptions, and ComplaintNotes -
-- these were the only tables damien's features use that had zero rows.
--
-- Run this AFTER:
--   - migration 006_damien_promo_code_unique_per_stall.sql
--   - seed_updates/004_damien_seed_menu_cuisines_and_complaints.sql
--     (needs the officer/operator accounts and the 2 sample complaints
--      it creates)
--   - seed_updates/002_Ben_inserted_menuitems_data.sql
--     (needs 'Traditional Beancurd' on stall 1 / Lao Ban Soya Beancurd)
--
-- Safe to run once - re-running will fail on the UNIQUE(stall_id, promo_code)
-- constraint, which just means it's already seeded.
-- =====================================================================

USE HawkerDB;
GO

-- ---------------------------------------------------------------------
-- 1. Promotions
--    4 rows across the two seeded stalls (Lao Ban Soya Beancurd = stall 1,
--    Laksa Legend = stall 2). Two of them intentionally reuse the SAME
--    promo_code ("WELCOME5") on two different stalls, to demonstrate the
--    BED-47 fix: promo_code is unique per-stall, not globally.
-- ---------------------------------------------------------------------

-- Active promo on Lao Ban Soya Beancurd, with a minimum spend requirement.
INSERT INTO Promotions
(stall_id, promo_code, description, discount_percent, start_date, end_date, is_active, min_spend_amount, max_redemptions)
VALUES
(
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'),
    'BEANCURD10',
    '10% off orders of $5 and above.',
    10.00,
    '2026-01-01',
    '2026-12-31',
    1,
    5.00,
    NULL
);
GO

-- Active promo on Laksa Legend, with a higher minimum spend.
INSERT INTO Promotions
(stall_id, promo_code, description, discount_percent, start_date, end_date, is_active, min_spend_amount, max_redemptions)
VALUES
(
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Laksa Legend'),
    'LAKSA15',
    '15% off orders of $10 and above.',
    15.00,
    '2026-01-01',
    '2026-12-31',
    1,
    10.00,
    NULL
);
GO

-- An OLD, deactivated promo on Lao Ban Soya Beancurd. Kept in the table
-- (never deleted) to show the "toggle off, don't delete" behaviour from
-- BED-47's acceptance criteria.
INSERT INTO Promotions
(stall_id, promo_code, description, discount_percent, start_date, end_date, is_active, min_spend_amount, max_redemptions)
VALUES
(
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'),
    'WELCOME5',
    'Launch-week welcome discount (ended).',
    5.00,
    '2025-01-01',
    '2025-01-31',
    0,
    NULL,
    100
);
GO

-- Laksa Legend reuses the exact same code "WELCOME5" - only possible
-- because promo_code is now scoped UNIQUE(stall_id, promo_code).
INSERT INTO Promotions
(stall_id, promo_code, description, discount_percent, start_date, end_date, is_active, min_spend_amount, max_redemptions)
VALUES
(
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Laksa Legend'),
    'WELCOME5',
    'Launch-week welcome discount.',
    5.00,
    '2026-01-01',
    '2026-12-31',
    1,
    NULL,
    100
);
GO

-- ---------------------------------------------------------------------
-- 2. A completed order that redeemed BEANCURD10 - this is the prerequisite
--    PromotionRedemptions needs (its order_id FK is NOT NULL), since the
--    Orders/OrderItems tables had no seed data either.
--    4x Traditional Beancurd @ $1.50 = $6.00 subtotal, 10% off = $0.60,
--    total_amount = $5.40.
-- ---------------------------------------------------------------------

INSERT INTO Orders
(patron_id, stall_id, promotion_id, order_status, total_amount, order_date,
    checkout_id, collection_method, delivery_address, postal_code, delivery_charge,
    payment_method, eco_friendly_packaging) /*added more attributes from "order_date" to eco packaging */
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com'),
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'),
    (SELECT promotion_id FROM Promotions WHERE promo_code = 'BEANCURD10' AND stall_id = (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd')),
    'Completed', 
    6.20,
    GETDATE(),
    'SEED-OLD-1',
    'Pickup',
    NULL,
    NULL,
    0.00,
    'Cash',
    1
);
GO

INSERT INTO OrderItems
(order_id, menu_item_id, quantity, unit_price, subtotal, item_name)/*added item_name, to show what items came from Orders table*/
VALUES
(
    (SELECT TOP 1 order_id FROM Orders WHERE checkout_id = 'SEED-OLD-1'),
    (SELECT TOP 1 menu_item_id FROM MenuItems WHERE item_name = 'Traditional Beancurd'),
    4,
    1.50,
    6.00,
    (SELECT TOP 1 item_name FROM MenuItems WHERE item_name = 'Traditional Beancurd')
);
GO

-- ---------------------------------------------------------------------
-- 3. PromotionRedemptions
--    The redemption record for the order above - links the promotion,
--    the order, and the patron, and records the exact discount applied.
-- ---------------------------------------------------------------------

INSERT INTO PromotionRedemptions
(promotion_id, order_id, patron_id, discount_amount)
VALUES
(
    (SELECT promotion_id FROM Promotions WHERE promo_code = 'BEANCURD10' AND stall_id = (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd')),
    (SELECT TOP 1 order_id FROM Orders WHERE checkout_id = 'SEED-OLD-1'),
    (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com'),
    0.60
);
GO

-- ---------------------------------------------------------------------
-- 4. ComplaintNotes
--    One note each on the two sample complaints from
--    seed_updates/004_damien_seed_menu_cuisines_and_complaints.sql -
--    the Hygiene complaint (officer) and the Service complaint (operator).
-- ---------------------------------------------------------------------

INSERT INTO ComplaintNotes
(complaint_id, officer_id, note)
VALUES
(
    (SELECT complaint_id FROM Complaints WHERE complaint_type = 'Hygiene' AND patron_id = (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com')),
    (SELECT user_id FROM Users WHERE email = 'tanisanofficer@example.com'),
    'Inspected the stall on-site; the table area has since been cleaned. Advised the vendor to wipe down tables between customers.'
);
GO

INSERT INTO ComplaintNotes
(complaint_id, officer_id, note)
VALUES
(
    (SELECT complaint_id FROM Complaints WHERE complaint_type = 'Service' AND patron_id = (SELECT user_id FROM Users WHERE email = 'felixisapatron@gmail.com')),
    (SELECT user_id FROM Users WHERE email = 'limisanoperator@example.com'),
    'Spoke with the vendor about wait times during peak hours; vendor has agreed to add a queue number system.'
);
GO
