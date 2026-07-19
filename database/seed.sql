USE HawkerDB;
GO

-- =====================================================================
-- Base data
-- =====================================================================

INSERT INTO HawkerCentres (centre_name, address, area, is_active)
VALUES
('Maxwell Food Centre', '1 Kadayanallur Street', 'Tanjong Pagar', 1),
('Old Airport Road Food Centre', '51 Old Airport Road', 'Kallang', 1),
('Chomp Chomp Food Centre', '20 Kensington Park Road', 'Serangoon', 1);

INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'Marcus Ong',
  'marcusisavendor@gmail.com',
  '$2b$10$xWIfVO0oXl.hlWWfRmDGbuBNvWth.8hYEzeEqjIRHi81Of7TectPG',
  'vendor',
  '91112222'
);

INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'Matthew Tan',
  'matthewisavendor@example.com',
  '$2b$10$dklflMqrsNVSyNNILV3mseDS38LjwhDUz6XkwgsYk9ta.JcE6psH6',
  'vendor',
  '91113333'
);

INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'Marcus Ng',
  'marcusisapatron@gmail.com',
  '$2b$10$7aHBIPNIqgM9g/bxqzQCaOZu.tpzQjr0m1CQUn3iC1WmCjHag2nGq',
  'patron',
  '81112222'
);

INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'FixitFelix',
  'felixisapatron@gmail.com',
  '$2b$10$ccmVB3tkVIi89HJ58HsxDOUQixbEEMYfYG.lOqW/W4KShLz/1bLHW',
  'patron',
  '81113333'
);


INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'QJ',
  'qjisavendor@gmail.com',
  '$2b$10$NBdBuCpxnhbJKB80.LU0Sebw5qGEDRyOx3SoOZ4A7yXt7suxoc/sa',
  'vendor',
  '91113333'
);


INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'marcusisavendor@gmail.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Lao Ban Soya Beancurd',
    'Chinese Cuisine',
    'Lao Ban Soya Beancurd is famous for its silky texture.',
    '#01-12',
    1
);

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Laksa Legend',
    'Chinese Cuisine',
    'Experience our signature rich and creamy laksa.',
    '#01-13',
    1
);

-- =====================================================================
-- merged from seed_updates/003_Marcus_inserted_stall.sql
-- (must run before 001_Ben_update_stalls_data.sql, which updates this stall)
-- =====================================================================

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_type, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Nasi Lemak Galore',
    'Malay Cuisine',
    'Start your day right with our fragrant coconut rice, served with crispy fried chicken wings, crunchy ikan bilis, roasted peanuts, and our signature sweet and spicy sambal chili. A hearty, traditional meal that satisfies every craving.',
    '#01-14',
    1
);

-- =====================================================================
-- merged from seed_updates/001_Ben_update_stalls_data.sql
-- =====================================================================

-- Update Lao Ban Soya Beancurd
UPDATE Stalls
SET
    operating_hours = '07:00 AM - 09:00 PM',
    price_range = '$1.50 - $2.50',
    phone_number = '81234567',
    image_url = 'img/Lao Ban Soya Beancurd.jpg'
WHERE stall_name = 'Lao Ban Soya Beancurd';
GO

-- Update Laksa Legend
UPDATE Stalls
SET
    operating_hours = '09:00 AM - 08:00 PM',
    price_range = '$5.00 - $7.00',
    phone_number = '98765432',
    image_url = 'img/Laksa Legend.jpg'
WHERE stall_name = 'Laksa Legend';
GO

-- Nasi Lemak Galore
UPDATE Stalls
SET
    vendor_id = '3',
    description = 'Start your day right with our fragrant coconut rice, served with crispy fried chicken wings, crunchy ikan bilis, roasted peanuts.',
    operating_hours = '07:00 AM - 08:00 PM',
    price_range = '$3.00 - $5.50',
    phone_number = '64567890',
    image_url = 'img/Nasi Lemak Galore.jpg'
WHERE stall_name = 'Nasi Lemak Galore';
GO

-- =====================================================================
-- merged from seed_updates/002_Ben_inserted_menuitems_data.sql
-- (stall_id 1 = Lao Ban Soya Beancurd, stall_id 2 = Laksa Legend)
-- =====================================================================

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, likes)
VALUES
(
    2,                                     -- stall_id for Laksa Legend
    'Signature Standard Laksa',            -- item_name
    'The classic favorite. Thick vermicelli in rich coconut broth with cockles, fish cake, and egg.', -- description
    5.00,                                  -- price
    'Main Course',                         -- category
    'img/Standard Laksa.jpg',              -- image_url
    1,                                     -- is_available (1 = true)
    1500                                   -- likes (The new column!)
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, likes)
VALUES
(
    2,                                     -- stall_id for Laksa Legend
    'Beef Meatball Laksa',                 -- item_name
    'A unique twist featuring juicy beef meatballs soaking up the spicy, creamy curry goodness.', -- description
    6.00,                                  -- price
    'Main Course',                         -- category
    'img/Beef Meetball Laksa.jpg',         -- image_url
    1,                                     -- is_available (1 = true)
    850                                    -- likes (The new column!)
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, likes)
VALUES
(
    2,                                     -- stall_id for Laksa Legend
    'Premium Seafood Laksa',               -- item_name
    'The ultimate bowl. Topped with fresh prawns, clams, and squid for seafood lovers.', -- description
    7.00,                                  -- price
    'Main Course',                         -- category
    'img/SeaFood Laksa.jpg',               -- image_url
    1,                                     -- is_available (1 = true)
    1100                                   -- likes (The new column!)
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, likes)
VALUES
(
    1,                                     -- stall_id for Lao Ban Soya Beancurd
    'Traditional Beancurd',                -- item_name
    'Silky smooth hot beancurd served with sweet sugar syrup.', -- description
    1.50,                                  -- price
    'Main Course',                         -- category
    'img/Lao Ban Soya Beancurd.jpg',       -- image_url
    1,                                     -- is_available (1 = true)
    1000                                   -- likes (The new column!)
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, likes)
VALUES
(
    1,                                     -- stall_id for Lao Ban Soya Beancurd
    'Almond Beancurd',                     -- item_name
    'Chilled beancurd pudding infused with fragrant almond flavor.', -- description
    2.00,                                  -- price
    'Main Course',                         -- category
    'img/tofu.jpg',                        -- image_url
    1,                                     -- is_available (1 = true)
    950                                    -- likes (The new column!)
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, likes)
VALUES
(
    1,                                     -- stall_id for Lao Ban Soya Beancurd
    'Grass Jelly Beancurd',                -- item_name
    'Classic beancurd topped with refreshing black grass jelly cubes.', -- description
    2.50,                                  -- price
    'Main Course',                         -- category
    'img/Lao Ban Soya Beancurd.jpg',       -- image_url
    1,                                     -- is_available (1 = true)
    700                                    -- likes (The new column!)
);
GO

-- =====================================================================
-- merged from seed_updates/004_damien_seed_menu_cuisines_and_complaints.sql
-- Requires the Cuisines / ComplaintNotes migration to already have run.
-- =====================================================================

-- Cuisines lookup data
INSERT INTO Cuisines (cuisine_name)
VALUES
('Chinese'),
('Malay'),
('Indian'),
('Halal'),
('Vegetarian'),
('Western'),
('Peranakan'),
('Seafood');
GO

-- An officer account to test /api/auth/login/officer and the officer-only
-- complaint routes with. Plaintext password: officer123
INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'Officer Tan',
  'tanisanofficer@example.com',
  '$2b$10$wXCbJJn3WAEyAk6Eo4vzeuToTUScY8k42HzvU/eXY5oONQR/0kJjS',
  'officer',
  '91114444'
);
GO

-- Sample complaints so the list/detail/acknowledge endpoints have data to
-- return.
INSERT INTO Complaints
(patron_id, stall_id, complaint_type, description, complaint_status)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com'),
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'),
    'Hygiene',
    'Food was served on an unwiped table and the stall area looked unclean.',
    'Open'
);
GO

INSERT INTO Complaints
(patron_id, stall_id, complaint_type, description, complaint_status)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'felixisapatron@gmail.com'),
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Laksa Legend'),
    'Service',
    'Waited over 40 minutes for a simple order with no apology from staff.',
    'Open'
);
GO

INSERT INTO Users
(full_name, email, password_hash, role, phone_number)
VALUES
(
  'Operator Lim',
  'limisanoperator@example.com',
  '$2b$10$fuGmASUIQMgEEHBLYONZPup9FsNqX/3VrPu5.ZM6/lB0Cp6ZG/T1K',
  'operator',
  '91115555'
);
GO

-- =====================================================================
-- merged from seed_updates/005_Marcus_updated_user_passwords.sql
-- NOTE: the 'benisapatron@gmail.com' update below matches zero rows -
-- no such user is seeded anywhere in this file - kept as-is from the
-- original file since it is harmless (0 rows affected).
-- =====================================================================

UPDATE Users
SET password_hash = '$2b$10$/2sdoKgNG4.xnl/G3WkzqOWZjWQ7rNHLuj4ZD5K74jJeKoxhJUnbq' /* New Password: Marcusisavendor123!*/
WHERE email = 'marcusisavendor@gmail.com';


UPDATE Users
SET password_hash = '$2b$10$I/kDTL.Uo1a0dldkqkDhxetSgCInowM.8n74HdXdZIpsaF/K8G3rO' /* New Password: Matthewisavendor123!*/
WHERE email = 'matthewisavendor@example.com';



UPDATE Users
SET password_hash = '$2b$10$mL3LZkDnZwbbg0KuB6bJXO/.1Ar.MgEsa7e6RLHHnoXvHOrnngfF.' /* New Password: Marcusisapatron123!*/
WHERE email = 'marcusisapatron@gmail.com';

UPDATE Users
SET password_hash = '$2b$10$smtwjZOKDsCjPyTkPxteh.yvdYAs.brNmgVg5qj3R3KPG9N.tQh46' /* New Password: Felixisapatron123!*/
WHERE email = 'felixisapatron@gmail.com';


UPDATE Users
SET password_hash = '$2b$10$.fbx.GuAwkF2Fq7kCd/5x.V1wq1EZVxwakSDxORt1NGXZoIvdL39e' /* New Password: Qjisavendor123!*/
WHERE email = 'qjisavendor@gmail.com';


UPDATE Users
SET password_hash = '$2b$10$ajDZvu98Km2jzXCYPk8cfuKan3rBCV81d1KubxeoAjqV1ggHa560O' /* New Password: Benisapatron123!*/
WHERE email = 'benisapatron@gmail.com';

-- =====================================================================
-- merged from seed_updates/006_Marcus_updated_marcusisapatron_password.sql
-- (supersedes the marcusisapatron password set immediately above -
-- this is the final password for that account)
-- =====================================================================

UPDATE Users
SET password_hash = '$2b$10$Oii210X91GNUl08y.m0T0uRztJWEudar66LzgWyFwI38hHlwprePW' /* New Password: Marcusisapatron123!*/
WHERE email = 'marcusisapatron@gmail.com';

-- =====================================================================
-- merged from seed_updates/007_Ben_inserted_stall.sql
-- =====================================================================

INSERT INTO stalls (
    vendor_id,
    stall_name,
    cuisine_type,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    4,
    'Ah Seng Chicken Rice',
    'Chinese Cuisine',
    'Beloved Southeast Asian dish consisting of tender, poached chicken served with fragrant, oily rice cooked in chicken broth',
    '#01-15',
    1,
    1,
    '06:00 AM - 10:00 PM',
    '$4.50 - $5.50',
    '91204019',
    'img/Ah Seng Chicken Rice.jpg'
);

INSERT INTO stalls (
    vendor_id,
    stall_name,
    cuisine_type,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    5,
    'Mee Rebus Master',
    'Malay Cuisine',
    'A bowl of warmth! Our Mee Rebus features yellow noodles drenched in a thick, savory-sweet gravy made from sweet potatoes and dried shrimp.',
    '#01-16',
    1,
    1,
    '07:00 AM - 05:00 AM',
    '$4.50 - $5.50',
    '67448899',
    'img/Mee Reebus Master.jpg'
);

INSERT INTO stalls (
    vendor_id,
    stall_name,
    cuisine_type,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    1,
    'Satay King',
    'Malay Cuisine',
    'This satay stall specializes in freshly grilled skewers of marinated meat, including chicken, beef, and mutton.',
    '#01-17',
    1,
    1,
    '06:00 AM - 10:00 PM',
    '$9.00 - $12.00',
    '81507018',
    'img/pexels-streetwindy-2108837.jpg'
);

INSERT INTO stalls (
    vendor_id,
    stall_name,
    cuisine_type,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    2,
    'Spring Leaf Prata',
    'Indian Cuisine',
    'Famous for our crispy outside, fluffy inside Roti Prata.',
    '#01-18',
    1,
    1,
    '08:00 AM - 11:00 PM',
    '$1.50 - $5.00',
    '64551234',
    'img/Spring Leaf Prata.jpg'
);

INSERT INTO stalls (
    vendor_id,
    stall_name,
    cuisine_type,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    2,
    'Wok Master',
    'Chinese Cuisine',
    'Beloved style of casual Chinese dining in Singapore, Malaysia, and the surrounding region..',
    '#01-19',
    1,
    1,
    '10:00 AM - 09:00 PM',
    '$6.50 - $15.00',
    '88223226',
    'img/White Kway Teow.jpg'
);

-- =====================================================================
-- merged from seed_updates/007_damien_seed_promotions_and_complaint_notes.sql
-- Requires: migration 006 (per-stall unique promo codes), the officer/
-- operator + 2 sample complaints seeded above, and 'Traditional Beancurd'
-- on stall 1 (Lao Ban Soya Beancurd) seeded above.
-- =====================================================================

-- 1. Promotions
--    4 rows across the two seeded stalls (Lao Ban Soya Beancurd = stall 1,
--    Laksa Legend = stall 2). Two of them intentionally reuse the SAME
--    promo_code ("WELCOME5") on two different stalls, to demonstrate the
--    BED-47 fix: promo_code is unique per-stall, not globally.

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

-- 2. A completed order that redeemed BEANCURD10 - this is the prerequisite
--    PromotionRedemptions needs (its order_id FK is NOT NULL).
--    4x Traditional Beancurd @ $1.50 = $6.00 subtotal, 10% off = $0.60,
--    total_amount = $5.40.

INSERT INTO Orders
(patron_id, stall_id, promotion_id, order_status, total_amount)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com'),
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'),
    (SELECT promotion_id FROM Promotions WHERE promo_code = 'BEANCURD10' AND stall_id = (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd')),
    'Completed',
    5.40
);
GO

INSERT INTO OrderItems
(order_id, menu_item_id, quantity, unit_price, subtotal)
VALUES
(
    (SELECT TOP 1 order_id FROM Orders WHERE total_amount = 5.40 ORDER BY order_id DESC),
    (SELECT menu_item_id FROM MenuItems WHERE item_name = 'Traditional Beancurd'),
    4,
    1.50,
    6.00
);
GO

-- 3. PromotionRedemptions
--    The redemption record for the order above - links the promotion,
--    the order, and the patron, and records the exact discount applied.

INSERT INTO PromotionRedemptions
(promotion_id, order_id, patron_id, discount_amount)
VALUES
(
    (SELECT promotion_id FROM Promotions WHERE promo_code = 'BEANCURD10' AND stall_id = (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd')),
    (SELECT TOP 1 order_id FROM Orders WHERE total_amount = 5.40 ORDER BY order_id DESC),
    (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com'),
    0.60
);
GO

-- 4. ComplaintNotes
--    One note each on the two sample complaints seeded above -
--    the Hygiene complaint (officer) and the Service complaint (operator).

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

-- =====================================================================
-- merged from seed_updates/008_Ryanng_fake_demo_data.sql
-- Demo/fake data for vendor presentation
-- Vendor: marcusisavendor@gmail.com (user_id 1)
-- Safe to re-run: skips inserts that already exist instead of duplicating.
-- =====================================================================

DECLARE @vendor_id INT = 1;
DECLARE @stall_id INT;
DECLARE @hawker_centre_id INT;
DECLARE @patron1_id INT = 3; -- Marcus Ng
DECLARE @patron2_id INT = 4; -- FixitFelix

-- 1. Stall (only creates one if this vendor doesn't already have one)

SELECT @hawker_centre_id = hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre';

IF NOT EXISTS (SELECT 1 FROM Stalls WHERE vendor_id = @vendor_id)
BEGIN
    INSERT INTO Stalls (vendor_id, stall_name, cuisine_type, description, unit_number, is_active, hawker_centre_id)
    VALUES (@vendor_id, 'Marcus Beancurd House', 'Chinese', 'Silky homemade beancurd and dessert soups since day one.', '#01-88', 1, @hawker_centre_id);
END

SELECT @stall_id = stall_id FROM Stalls WHERE vendor_id = @vendor_id;

-- 2. Menu items

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

-- 3. Promotions

IF NOT EXISTS (SELECT 1 FROM Promotions WHERE stall_id = @stall_id AND promo_code = 'WELCOME10')
    INSERT INTO Promotions (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active)
    VALUES (@stall_id, 'WELCOME10', '10% off your first order', 10.00, CAST(GETDATE() AS DATE), DATEADD(DAY, 30, CAST(GETDATE() AS DATE)), 1);

IF NOT EXISTS (SELECT 1 FROM Promotions WHERE stall_id = @stall_id AND promo_code = 'BEANCURD20')
    INSERT INTO Promotions (stall_id, promo_code, description, discount_percent, start_date, end_date, is_active)
    VALUES (@stall_id, 'BEANCURD20', '20% off orders above $8', 20.00, CAST(GETDATE() AS DATE), DATEADD(DAY, 14, CAST(GETDATE() AS DATE)), 1);

-- 4. Orders (mix of statuses + dates, so the dashboard/order list look real)

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

-- 5. Feedback (so "Average Rating" on the dashboard shows a real number)

IF NOT EXISTS (SELECT 1 FROM Feedbacks WHERE stall_id = @stall_id)
BEGIN
    INSERT INTO Feedbacks (patron_id, stall_id, rating, comment) VALUES
        (@patron1_id, @stall_id, 5, 'Silkiest beancurd in the whole hawker centre!'),
        (@patron2_id, @stall_id, 4, 'Great taste, a bit of a wait during lunch rush.');
END

-- Quick check - see everything that just went in

SELECT * FROM Stalls WHERE vendor_id = @vendor_id;
SELECT * FROM MenuItems WHERE stall_id = @stall_id;
SELECT * FROM Promotions WHERE stall_id = @stall_id;
SELECT * FROM Orders WHERE stall_id = @stall_id ORDER BY order_date DESC;
SELECT * FROM Feedbacks WHERE stall_id = @stall_id;
