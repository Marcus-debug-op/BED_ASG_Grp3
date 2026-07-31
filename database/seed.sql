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
('Seafood'),
('Drinks'),
('Dessert'),
('Snacks');
GO

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_id, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'marcusisavendor@gmail.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Lao Ban Soya Beancurd',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
    'Lao Ban Soya Beancurd is famous for its silky texture.',
    '#01-12',
    1
);

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_id, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Laksa Legend',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Malay'),
    'Experience our signature rich and creamy laksa.',
    '#01-13',
    1
);

-- =====================================================================
-- merged from seed_updates/003_Marcus_inserted_stall.sql
-- (must run before 001_Ben_update_stalls_data.sql, which updates this stall)
-- =====================================================================

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_id, description, unit_number, is_active)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Maxwell Food Centre'),
    'Nasi Lemak Galore',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Malay'),
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
    vendor_id = (SELECT user_id FROM Users WHERE email = 'qjisavendor@gmail.com'),
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
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Laksa Legend'), -- stall_id for Laksa Legend
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
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Laksa Legend'), -- stall_id for Laksa Legend
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
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Laksa Legend'), -- stall_id for Laksa Legend
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
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'), -- stall_id for Lao Ban Soya Beancurd
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
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'), -- stall_id for Lao Ban Soya Beancurd
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
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'), -- stall_id for Lao Ban Soya Beancurd
    'Grass Jelly Beancurd',                -- item_name
    'Classic beancurd topped with refreshing black grass jelly cubes.', -- description
    2.50,                                  -- price
    'Main Course',                         -- category
    'img/Lao Ban Soya Beancurd.jpg',       -- image_url
    1,                                     -- is_available (1 = true)
    700                                    -- likes (The new column!)
);
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

UPDATE Users
SET badge_id = 'NEA-0042'
WHERE email = 'tanisanofficer@example.com';
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
UPDATE Users SET badge_id = 'NEA-OPS-01' WHERE email = 'limisanoperator@example.com';
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
    cuisine_id,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    (SELECT user_id FROM Users WHERE email = 'qjisavendor@gmail.com'),
    'Ah Seng Chicken Rice',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
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
    cuisine_id,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    (SELECT user_id FROM Users WHERE email = 'qjisavendor@gmail.com'),
    'Mee Rebus Master',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Malay'),
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
    cuisine_id,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    (SELECT user_id FROM Users WHERE email = 'marcusisavendor@gmail.com'),
    'Satay King',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Malay'),
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
    cuisine_id,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    'Spring Leaf Prata',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Indian'),
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
    cuisine_id,
    description,
    unit_number,
    is_active,
    hawker_centre_id,
    operating_hours,
    price_range,
    phone_number,
    image_url
) VALUES (
    (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
    'Wok Master',
    (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
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
-- merged from seed_updates/009_Marcus_add_stalls_to_other_hawkers.sql
-- Converted to use cuisine_id instead of removed cuisine_type.
-- =====================================================================

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_id, description, unit_number, is_active, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'marcusisavendor@gmail.com'),
  (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Old Airport Road Food Centre'),
  'Old Airport Char Kway Teow',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Wok-fried char kway teow with smoky flavour and fresh ingredients.',
  '#02-21',
  1,
  '09:00 AM - 09:00 PM',
  '$4.00 - $6.00',
  '91230001',
  'img/White Kway Teow.jpg'
);
GO

INSERT INTO Stalls
(vendor_id, hawker_centre_id, stall_name, cuisine_id, description, unit_number, is_active, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'matthewisavendor@example.com'),
  (SELECT hawker_centre_id FROM HawkerCentres WHERE centre_name = 'Chomp Chomp Food Centre'),
  'Chomp Chomp Satay House',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Malay'),
  'Freshly grilled satay served with peanut sauce and rice cakes.',
  '#03-22',
  1,
  '05:00 PM - 11:00 PM',
  '$8.00 - $12.00',
  '91230002',
  'img/pexels-streetwindy-2108837.jpg'
);
GO

-- =====================================================================
-- merged from seed_updates/010_Ben_insert_vendoraccs.sql
-- Extra vendor accounts used by the additional stall seed data.
-- =====================================================================

INSERT INTO Users (full_name, email, password_hash, role, phone_number, created_at, profile_image_url)
VALUES
('Ahmad', 'ahmadisavendor@gmail.com', '$2b$10$O8Ya.PgkHx/rKLinsSjEZuXPUE0wvS71/dYM4truad5i/rVsuOrm2', 'vendor', '91238801', GETDATE(), NULL), /* New Password: Ahmadisavendor123!* */
('Shirley', 'shirleyisavendor@gmail.com', '$2b$10$MZIlNNX.WrnvMX.Sc8tTrufeqZAHD/ZHtqD30Qf6M7DdYmnd5dxM6', 'vendor', '91238802', GETDATE(), NULL), /* New Password: Shirleyisavendor123!* */
('Muthu', 'muthuisavendor@gmail.com', '$2b$10$Mtx.JiSPzWuW9uZ60LlTgOpAOaOxuAnHMY31puwHMPXC85pXhzEN6', 'vendor', '91238803', GETDATE(), NULL), /* New Password: Muthuisavendor123!* */
('Nurul', 'nurulisavendor@gmail.com', '$2b$10$xX0hee1yJ4u4AmfItmqmhu0IkzwIYTTupYqCTqo284zZULVaTDVNW', 'vendor', '91238804', GETDATE(), NULL), /* New Password: Nurulisavendor123!* */
('David', 'davidisavendor@gmail.com', '$2b$10$fOcWnLedObRV0Vs0kOSBROpYfSFlgbp0CbCZkWC1ZYQpPirzaouY6', 'vendor', '91238805', GETDATE(), NULL), /* New Password: Davidisavendor123!* */
('Siti', 'sitiisavendor@gmail.com', '$2b$10$sicksYZiMKv4UNOra/v2iuQW5UG7aXv5/TQIG32v986.CfuOS8YJS', 'vendor', '91238806', GETDATE(), NULL), /* New Password: Sitiisavendor123!* */
('Ramesh', 'rameshisavendor@gmail.com', '$2b$10$40erwb45LKnnxx5YUWSicu9D54E4ZTTIlmT8NtDUipY0101AjguiC', 'vendor', '91238807', GETDATE(), NULL), /* New Password: Rameshisavendor123!* */
('Faridah', 'faridahisavendor@gmail.com', '$2b$10$jV7WUCexWFSwVqSE.w2rGe1cTqDsMod1bAJ8PxFvCCktZsgP2YJUK', 'vendor', '91238808', GETDATE(), NULL), /* New Password: Faridahisavendor123!* */
('Suresh', 'sureshisavendor@gmail.com', '$2b$10$vHadhsxUKVeb./uzFLP6keuiZDEoTokFKG38pTW4tjddNdPnZRhlq', 'vendor', '91238809', GETDATE(), NULL), /* New Password: Sureshisavendor123!* */
('Grace', 'graceisavendor@gmail.com', '$2b$10$oC0mna0IQpkhLBc7aAAM5ewJesW65QZ844KZKe0v6EMfIUuinTMqy', 'vendor', '91238810', GETDATE(), NULL), /* New Password: Graceisavendor123!* */
('Faizal', 'faizalisavendor@gmail.com', '$2b$10$ysuyWwpX2a3tCuaC640rpusXbO35FcLF4c0f8a4IZHyfYgmpnngRS', 'vendor', '91238811', GETDATE(), NULL), /* New Password: Faizalisavendor123!* */
('Joanne', 'joanneisavendor@gmail.com', '$2b$10$sYwvrS6XOYUJWl6R582Dx.L/qkfnxWCFeb3joXRe62mjnfQqgrhPa', 'vendor', '91238812', GETDATE(), NULL); /* New Password: Joanneisavendor123!* */
GO

-- =====================================================================
-- merged from seed_updates/011_Ben_insert_stalls.sql
-- Converted to use cuisine_id and vendor email lookups.
-- =====================================================================

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'ahmadisavendor@gmail.com'),
  'Sugar Cane Oasis',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Drinks'),
  'Freshly pressed sugar cane juice to beat the heat.',
  '#01-30',
  1,
  1,
  '08:00 AM - 10:00 PM',
  '$1.50 - $3.00',
  '91234501',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'ahmadisavendor@gmail.com'),
  'Aunties Kopi & Teh',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Drinks'),
  'Traditional Nanyang coffee and tea brewed to perfection.',
  '#01-31',
  1,
  1,
  '06:00 AM - 08:00 PM',
  '$1.20 - $2.50',
  '91234502',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'shirleyisavendor@gmail.com'),
  'Cool Dessert Haven',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Dessert'),
  'Refreshing local shaved ice desserts and more.',
  '#01-32',
  1,
  2,
  '11:00 AM - 10:00 PM',
  '$2.00 - $4.00',
  '91234503',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'shirleyisavendor@gmail.com'),
  'Ah Mas Tang Yuan',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Dessert'),
  'Handmade glutinous rice balls in sweet warm soup.',
  '#01-33',
  1,
  2,
  '12:00 PM - 11:00 PM',
  '$2.50 - $4.50',
  '91234504',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'muthuisavendor@gmail.com'),
  'Fresh Fruit Juices',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Drinks'),
  '100% freshly blended tropical fruit juices.',
  '#01-34',
  1,
  1,
  '09:00 AM - 10:00 PM',
  '$2.00 - $4.00',
  '91234505',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'muthuisavendor@gmail.com'),
  'Mango Sago Sweet',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Dessert'),
  'Specialty mango desserts and rich durian mousse.',
  '#01-35',
  1,
  3,
  '12:00 PM - 11:00 PM',
  '$3.00 - $6.00',
  '91234506',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'nurulisavendor@gmail.com'),
  'Soya Bean Delights',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Drinks'),
  'Smooth soya bean milk and crispy youtiao.',
  '#01-36',
  1,
  1,
  '06:00 AM - 09:00 PM',
  '$1.50 - $3.00',
  '91234507',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'nurulisavendor@gmail.com'),
  'Bubble Tea Stop',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Drinks'),
  'Modern bubble tea with chewy brown sugar pearls.',
  '#01-37',
  1,
  2,
  '11:00 AM - 10:00 PM',
  '$3.00 - $5.50',
  '91234508',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'davidisavendor@gmail.com'),
  'Hainanese Curry Rice',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Messy but delicious curry rice topped with crispy pork.',
  '#01-38',
  1,
  1,
  '10:00 AM - 09:00 PM',
  '$4.00 - $6.00',
  '91234509',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'davidisavendor@gmail.com'),
  'Al-Ameen Murtabak',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Indian'),
  'Thick, pan-fried stuffed folded omelette pancake.',
  '#01-39',
  1,
  2,
  '24 Hours',
  '$6.00 - $12.00',
  '91234510',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'sitiisavendor@gmail.com'),
  'Xin Tian Di Roast Meat',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Caramelized char siew and crispy roast pork belly.',
  '#02-01',
  1,
  3,
  '10:00 AM - 08:00 PM',
  '$4.50 - $8.00',
  '91234511',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'sitiisavendor@gmail.com'),
  'Goreng Pisang Crispy',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Snacks'),
  'Piping hot deep-fried banana and tapioca fritters.',
  '#02-02',
  1,
  1,
  '11:00 AM - 07:00 PM',
  '$1.00 - $3.00',
  '91234512',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'rameshisavendor@gmail.com'),
  'Marina BBQ Seafood',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Seafood'),
  'Signature sambal stingray grilled perfectly on banana leaf.',
  '#02-03',
  1,
  2,
  '05:00 PM - 12:00 AM',
  '$12.00 - $30.00',
  '91234513',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'rameshisavendor@gmail.com'),
  'Uncle Oyster Omelette',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Crispy and fluffy Orh Luak with plump oysters.',
  '#02-04',
  1,
  3,
  '04:00 PM - 11:00 PM',
  '$5.00 - $10.00',
  '91234514',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'faridahisavendor@gmail.com'),
  'Western Grill Station',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Western'),
  'Old-school sizzling hotplate chops and cutlets.',
  '#02-05',
  1,
  1,
  '11:00 AM - 10:00 PM',
  '$6.00 - $15.00',
  '91234515',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'faridahisavendor@gmail.com'),
  'Ban Mian Tradition',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Handmade noodles in rich ikan bilis broth.',
  '#02-06',
  1,
  2,
  '09:00 AM - 09:00 PM',
  '$4.00 - $6.00',
  '91234516',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'sureshisavendor@gmail.com'),
  'Healthy Yong Tau Foo',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Pick your own fresh vegetables and stuffed tofu.',
  '#02-07',
  1,
  1,
  '08:00 AM - 08:00 PM',
  '$4.00 - $7.00',
  '91234517',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'graceisavendor@gmail.com'),
  'MacPherson Bak Chor Mee',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Chinese'),
  'Springy noodles tossed in vinegar and chili with minced pork.',
  '#02-08',
  1,
  3,
  '07:00 AM - 02:00 PM',
  '$4.50 - $6.50',
  '91234518',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'faizalisavendor@gmail.com'),
  'Popiah & Kueh Pie Tee',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Snacks'),
  'Freshly wrapped popiah with crunchy turnip filling.',
  '#02-09',
  1,
  1,
  '10:00 AM - 08:00 PM',
  '$2.00 - $5.00',
  '91234519',
  ''
);
GO

INSERT INTO Stalls
(vendor_id, stall_name, cuisine_id, description, unit_number, is_active, hawker_centre_id, operating_hours, price_range, phone_number, image_url)
VALUES
(
  (SELECT user_id FROM Users WHERE email = 'joanneisavendor@gmail.com'),
  'Nasi Padang Corner',
  (SELECT cuisine_id FROM Cuisines WHERE cuisine_name = 'Malay'),
  'Richly spiced dishes like beef rendang and ayam merah.',
  '#02-10',
  1,
  2,
  '10:00 AM - 07:00 PM',
  '$5.00 - $10.00',
  '91234520',
  ''
);
GO

-- =====================================================================
-- merged from seed_updates/012_Ben_insert_menuitem.sql
-- Converted to use stall name lookups instead of hardcoded stall_id values.
-- =====================================================================

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Nasi Lemak Galore'),
  'Chicken Wing Nasi Lemak',
  'Crispy chicken wing with fragrant coconut rice and sambal.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  420
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Nasi Lemak Galore'),
  'Fish Fillet Nasi Lemak',
  'Fried fish fillet with coconut rice and peanuts.',
  4.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  310
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Nasi Lemak Galore'),
  'Otah Nasi Lemak',
  'Spicy grilled fish paste otah with coconut rice.',
  4.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  350
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ah Seng Chicken Rice'),
  'Steamed Chicken Rice',
  'Classic Hainanese steamed chicken with fragrant rice.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ah Seng Chicken Rice'),
  'Roasted Chicken Rice',
  'Tender roasted chicken with savory soy sauce.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  580
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ah Seng Chicken Rice'),
  'Oyster Sauce Vegetables',
  'Blanched leafy greens topped with oyster sauce.',
  3.00,
  'Side Dish',
  '',
  1,
  GETDATE(),
  200
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Mee Rebus Master'),
  'Mee Rebus Special',
  'Yellow noodles in rich and sweet potato gravy.',
  4.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  450
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Mee Rebus Master'),
  'Mee Soto',
  'Yellow noodles in a spicy chicken broth.',
  4.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  390
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Mee Rebus Master'),
  'Begedil',
  'Deep-fried potato patty.',
  1.00,
  'Side Dish',
  '',
  1,
  GETDATE(),
  250
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Satay King'),
  'Chicken Satay (10 Pcs)',
  'Tender grilled chicken skewers with peanut sauce.',
  8.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  800
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Satay King'),
  'Mutton Satay (10 Pcs)',
  'Flavorful mutton skewers charred to perfection.',
  9.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  750
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Satay King'),
  'Ketupat',
  'Traditional compressed rice cakes.',
  1.00,
  'Side Dish',
  '',
  1,
  GETDATE(),
  300
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Spring Leaf Prata'),
  'Plain Prata (2 Pcs)',
  'Crispy on the outside, fluffy on the inside.',
  3.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Spring Leaf Prata'),
  'Egg Prata',
  'Classic prata folded with a beaten egg.',
  2.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  550
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Spring Leaf Prata'),
  'Chicken Curry',
  'Rich and spicy chicken curry.',
  4.00,
  'Side Dish',
  '',
  1,
  GETDATE(),
  400
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Wok Master'),
  'Seafood Hor Fun',
  'Flat rice noodles wrapped in silky egg gravy.',
  6.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  520
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Wok Master'),
  'Beef Hor Fun',
  'Tender beef slices with stir-fried flat noodles.',
  6.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  480
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Wok Master'),
  'Yang Zhou Fried Rice',
  'Classic fried rice with char siew and shrimp.',
  5.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  410
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Old Airport Char Kway Teow'),
  'Cockle Char Kway Teow',
  'Wok-hei infused noodles with plump blood cockles.',
  5.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  720
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Old Airport Char Kway Teow'),
  'Egg Char Kway Teow',
  'Noodles stir-fried with extra egg and dark soy sauce.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  500
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Old Airport Char Kway Teow'),
  'Otah',
  'Spicy grilled fish cake wrapped in banana leaf.',
  1.50,
  'Side Dish',
  '',
  1,
  GETDATE(),
  300
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Chomp Chomp Satay House'),
  'Pork Satay (10 Pcs)',
  'Juicy pork skewers with a caramelized glaze.',
  8.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  850
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Chomp Chomp Satay House'),
  'Beef Satay (10 Pcs)',
  'Tender beef skewers with spicy peanut dip.',
  8.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  700
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Chomp Chomp Satay House'),
  'BBQ Chicken Wings (2 Pcs)',
  'Smoky, honey-glazed grilled chicken wings.',
  3.50,
  'Snacks',
  '',
  1,
  GETDATE(),
  900
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Sugar Cane Oasis'),
  'Sugar Cane Juice (Large)',
  'Ice cold, pure sugar cane juice.',
  2.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  500
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Sugar Cane Oasis'),
  'Sugar Cane with Lemon',
  'Sugar cane juice with a refreshing twist of lemon.',
  3.00,
  'Drinks',
  '',
  1,
  GETDATE(),
  450
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Sugar Cane Oasis'),
  'Fresh Coconut Water',
  'Whole coconut opened fresh to order.',
  3.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Aunties Kopi & Teh'),
  'Kopi O (Hot)',
  'Traditional black coffee with sugar.',
  1.20,
  'Drinks',
  '',
  1,
  GETDATE(),
  800
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Aunties Kopi & Teh'),
  'Teh C (Ice)',
  'Tea with evaporated milk and sugar over ice.',
  1.80,
  'Drinks',
  '',
  1,
  GETDATE(),
  750
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Aunties Kopi & Teh'),
  'Milo Dinosaur',
  'Iced Milo topped with a mountain of Milo powder.',
  3.00,
  'Drinks',
  '',
  1,
  GETDATE(),
  900
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Cool Dessert Haven'),
  'Ice Kachang',
  'Shaved ice mountain with colorful syrups and jellies.',
  2.50,
  'Dessert',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Cool Dessert Haven'),
  'Chendol',
  'Coconut milk, palm sugar, and pandan jelly bits.',
  3.00,
  'Dessert',
  '',
  1,
  GETDATE(),
  820
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Cool Dessert Haven'),
  'Cheng Tng (Cold)',
  'Refreshing clear sweet soup with longan and white fungus.',
  2.50,
  'Dessert',
  '',
  1,
  GETDATE(),
  400
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ah Mas Tang Yuan'),
  'Peanut Tang Yuan',
  'Glutinous rice balls filled with crushed peanuts.',
  2.50,
  'Dessert',
  '',
  1,
  GETDATE(),
  450
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ah Mas Tang Yuan'),
  'Black Sesame Tang Yuan',
  'Glutinous rice balls filled with rich black sesame paste.',
  2.50,
  'Dessert',
  '',
  1,
  GETDATE(),
  500
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ah Mas Tang Yuan'),
  'Red Bean Soup',
  'Warm and comforting traditional red bean sweet soup.',
  2.00,
  'Dessert',
  '',
  1,
  GETDATE(),
  300
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Fresh Fruit Juices'),
  'Watermelon Juice',
  'Freshly blended sweet watermelon.',
  2.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  550
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Fresh Fruit Juices'),
  'Orange Juice',
  '100% freshly squeezed oranges.',
  3.00,
  'Drinks',
  '',
  1,
  GETDATE(),
  480
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Fresh Fruit Juices'),
  'ABC Juice',
  'Healthy blend of Apple, Beetroot, and Carrot.',
  3.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  350
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Mango Sago Sweet'),
  'Mango Sago Pomelo',
  'Chilled mango purée with sago pearls and pomelo sacs.',
  4.50,
  'Dessert',
  '',
  1,
  GETDATE(),
  750
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Mango Sago Sweet'),
  'Mango Pudding',
  'Smooth pudding made from fresh mangoes.',
  3.00,
  'Dessert',
  '',
  1,
  GETDATE(),
  400
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Mango Sago Sweet'),
  'Durian Mousse',
  'Rich and creamy mousse made from real D24 durian.',
  5.50,
  'Dessert',
  '',
  1,
  GETDATE(),
  850
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Soya Bean Delights'),
  'Soya Bean Milk (Cold)',
  'Freshly brewed traditional soya bean milk.',
  1.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Soya Bean Delights'),
  'Soya Bean with Grass Jelly',
  'Michael Jackson mix - Soya milk and dark grass jelly.',
  2.00,
  'Drinks',
  '',
  1,
  GETDATE(),
  500
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Soya Bean Delights'),
  'Youtiao',
  'Crispy deep-fried dough fritters, perfect for dipping.',
  1.20,
  'Snacks',
  '',
  1,
  GETDATE(),
  700
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Bubble Tea Stop'),
  'Brown Sugar Pearl Milk',
  'Fresh milk layered with rich brown sugar syrup and pearls.',
  4.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  950
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Bubble Tea Stop'),
  'Classic Milk Tea',
  'Traditional brewed tea with milk and chewy tapioca pearls.',
  3.50,
  'Drinks',
  '',
  1,
  GETDATE(),
  800
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Bubble Tea Stop'),
  'Taro Milk Tea',
  'Creamy and sweet taro-flavored milk tea.',
  4.00,
  'Drinks',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Hainanese Curry Rice'),
  'Pork Chop Curry Rice',
  'Crispy pork chop smothered in rich Hainanese curry.',
  5.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  780
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Hainanese Curry Rice'),
  'Braised Pork Belly Rice',
  'Melt-in-your-mouth braised pork with curry sauce.',
  5.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Hainanese Curry Rice'),
  'Curry Cabbage',
  'Soft, slow-cooked cabbage in mild curry.',
  1.50,
  'Side Dish',
  '',
  1,
  GETDATE(),
  300
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Al-Ameen Murtabak'),
  'Chicken Murtabak',
  'Pan-fried dough stuffed with minced chicken and onions.',
  7.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Al-Ameen Murtabak'),
  'Mutton Murtabak',
  'Savory stuffed dough with spiced minced mutton.',
  8.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  750
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Al-Ameen Murtabak'),
  'Teh Tarik',
  'Hot, frothy pulled tea to go with your meal.',
  1.80,
  'Drinks',
  '',
  1,
  GETDATE(),
  400
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Xin Tian Di Roast Meat'),
  'Char Siew Rice',
  'Sweet and sticky caramelized roast pork with rice.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  720
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Xin Tian Di Roast Meat'),
  'Roast Pork Belly Rice (Sio Bak)',
  'Roast pork with an ultra-crispy crackling skin.',
  5.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  800
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Xin Tian Di Roast Meat'),
  'Roast Duck Rice',
  'Tender roast duck bathed in herbal savory sauce.',
  5.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Goreng Pisang Crispy'),
  'Banana Fritter (Goreng Pisang)',
  'Sweet ripe banana enveloped in a crispy batter.',
  1.50,
  'Snacks',
  '',
  1,
  GETDATE(),
  850
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Goreng Pisang Crispy'),
  'Tapioca Fritter',
  'Dense and sweet deep-fried tapioca cake.',
  1.20,
  'Snacks',
  '',
  1,
  GETDATE(),
  400
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Goreng Pisang Crispy'),
  'Sweet Potato Fritter',
  'Crispy battered sweet potato slices.',
  1.20,
  'Snacks',
  '',
  1,
  GETDATE(),
  350
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Marina BBQ Seafood'),
  'Sambal Stingray',
  'Grilled stingray slathered in spicy, smoky sambal paste.',
  15.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  950
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Marina BBQ Seafood'),
  'BBQ Sotong',
  'Fresh squid grilled and tossed in sweet and spicy sauce.',
  12.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Marina BBQ Seafood'),
  'Garlic Lala',
  'Clams stir-fried in a rich garlic and chili broth.',
  10.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  550
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Uncle Oyster Omelette'),
  'Oyster Omelette (Orh Luak)',
  'Starchy and crispy egg batter packed with fresh oysters.',
  6.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  800
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Uncle Oyster Omelette'),
  'Fried Oyster (Orh Jian)',
  'Fluffier version of the oyster omelette with less starch.',
  6.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Uncle Oyster Omelette'),
  'Prawn Omelette',
  'Crispy omelette substituting oysters with fresh prawns.',
  6.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  450
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Western Grill Station'),
  'Chicken Chop',
  'Grilled chicken thigh with black pepper or mushroom sauce.',
  7.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  750
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Western Grill Station'),
  'Fish and Chips',
  'Battered fish fillet fried till golden, served with fries.',
  7.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Western Grill Station'),
  'Sirloin Steak',
  'Sizzling sirloin steak served with baked beans and fries.',
  12.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  500
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ban Mian Tradition'),
  'Soup Ban Mian',
  'Flat handmade noodles in soup with minced pork and an egg.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  700
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ban Mian Tradition'),
  'Dry Ban Mian',
  'Noodles tossed in dark soy sauce, topped with crispy ikan bilis.',
  5.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Ban Mian Tradition'),
  'Tom Yum Ban Mian',
  'Handmade noodles in a spicy and sour tom yum broth.',
  5.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  450
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Healthy Yong Tau Foo'),
  'Soup Yong Tau Foo (6 Pcs + Noodles)',
  'Assorted stuffed tofu and veggies in clear soy bean broth.',
  5.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  850
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Healthy Yong Tau Foo'),
  'Dry Yong Tau Foo (6 Pcs + Noodles)',
  'Ingredients drizzled with sweet sauce and chili sauce.',
  5.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  700
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Healthy Yong Tau Foo'),
  'Laksa Yong Tau Foo (6 Pcs + Noodles)',
  'Served in a rich, spicy coconut milk gravy.',
  6.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  900
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'MacPherson Bak Chor Mee'),
  'Bak Chor Mee (Dry)',
  'Noodles tossed in vinegar/chili, topped with minced pork.',
  5.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  880
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'MacPherson Bak Chor Mee'),
  'Bak Chor Mee (Soup)',
  'Minced meat noodles served in a rich, cloudy pork broth.',
  5.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'MacPherson Bak Chor Mee'),
  'Fishball Noodles',
  'Springy noodles served with bouncy handmade fishballs.',
  4.50,
  'Main Course',
  '',
  1,
  GETDATE(),
  550
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Popiah & Kueh Pie Tee'),
  'Traditional Popiah',
  'Soft crepe wrapped around stewed turnips, eggs, and peanuts.',
  2.00,
  'Snacks',
  '',
  1,
  GETDATE(),
  750
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Popiah & Kueh Pie Tee'),
  'Kueh Pie Tee (5 Pcs)',
  'Crispy pastry shells filled with spicy, sweet turnip mixture.',
  4.00,
  'Snacks',
  '',
  1,
  GETDATE(),
  600
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Popiah & Kueh Pie Tee'),
  'Rojak',
  'Local fruit and dough fritter salad in sweet shrimp paste.',
  4.50,
  'Snacks',
  '',
  1,
  GETDATE(),
  650
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Nasi Padang Corner'),
  'Beef Rendang Rice',
  'Slow-cooked, melt-in-your-mouth beef in dry coconut curry.',
  7.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  820
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Nasi Padang Corner'),
  'Ayam Masak Merah Rice',
  'Chicken pieces cooked in a spicy tomato sauce.',
  6.00,
  'Main Course',
  '',
  1,
  GETDATE(),
  700
);
GO

INSERT INTO MenuItems
(stall_id, item_name, description, price, category, image_url, is_available, created_at, likes)
VALUES
(
  (SELECT stall_id FROM Stalls WHERE stall_name = 'Nasi Padang Corner'),
  'Sambal Goreng',
  'Stir-fried tofu, tempeh, and long beans in chili paste.',
  2.00,
  'Side Dish',
  '',
  1,
  GETDATE(),
  400
);
GO

/* Not in used, but I'll just comment it off
-- =========================================================
-- Seed MenuItemCuisines
-- Links menu items to cuisine categories.
-- This helps with cuisine filtering/searching.
-- =========================================================

INSERT INTO MenuItemCuisines (menu_item_id, cuisine_id)
SELECT 
    mi.menu_item_id,
    c.cuisine_id
FROM MenuItems mi
INNER JOIN Stalls s
    ON mi.stall_id = s.stall_id
INNER JOIN Cuisines c
    ON s.cuisine_id = c.cuisine_id
WHERE NOT EXISTS (
    SELECT 1
    FROM MenuItemCuisines mic
    WHERE mic.menu_item_id = mi.menu_item_id
      AND mic.cuisine_id = c.cuisine_id
);
GO
*/ 

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
(patron_id, stall_id, promotion_id, order_status, total_amount, order_date,
    checkout_id, collection_method, delivery_address, postal_code,
    delivery_charge, payment_method, eco_friendly_packaging)
VALUES
(
    (SELECT user_id FROM Users WHERE email = 'marcusisapatron@gmail.com'),
    (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd'),
    (SELECT promotion_id FROM Promotions WHERE promo_code = 'BEANCURD10' AND stall_id = (SELECT stall_id FROM Stalls WHERE stall_name = 'Lao Ban Soya Beancurd')),
    'Completed', 5.60, GETDATE(), 'SEED-OLD-1', 'Pickup', '123 Sample Street #05-01',
    '123456', 0.00, 'Cash',  1
);
GO

INSERT INTO OrderItems
(order_id, menu_item_id, quantity, unit_price, subtotal, item_name)
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

-- 3. PromotionRedemptions
--    The redemption record for the order above - links the promotion,
--    the order, and the patron, and records the exact discount applied.

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
-- merged from seed_updates/013_Marcus_change_1eco_0_to_1.sql
-- Sets one demo completed order to request eco-friendly packaging.
-- Uses TOP (1) instead of hardcoding order_id = 18 so fresh DB setup is safe.
-- =====================================================================

UPDATE TOP (1) Orders
SET eco_friendly_packaging = 1
WHERE order_status = 'Completed';
GO



-- =========================================================
-- Seed Orders: 3 sample orders per stall
-- This uses existing stalls, menu items, and the first patron account.
-- =========================================================

DECLARE @SeedPatronId INT;

SELECT TOP 1 @SeedPatronId = user_id
FROM Users
WHERE role = 'patron'
ORDER BY user_id;

IF @SeedPatronId IS NULL
BEGIN
    PRINT 'No patron account found. Orders were not inserted.';
END
ELSE
BEGIN
    -- Store the orders we insert so we can link OrderItems correctly.
    DECLARE @InsertedOrders TABLE (
        order_id INT,
        stall_id INT,
        order_no INT
    );

    ;WITH StallOrderSeed AS (
        SELECT
            s.stall_id,
            order_seed.order_no,
            order_seed.order_status,
            order_seed.eco_friendly_packaging,
            order_seed.payment_method,
            order_seed.days_ago,
            mi.menu_item_id,
            mi.item_name,
            mi.price
        FROM Stalls s
        CROSS APPLY (
            SELECT TOP 1
                m.menu_item_id,
                m.item_name,
                m.price
            FROM MenuItems m
            WHERE m.stall_id = s.stall_id
            ORDER BY m.menu_item_id
        ) mi
        CROSS JOIN (
            VALUES
                (1, 'Completed', 1, 'Cash', 3),
                (2, 'Pending',   0, 'PayNow', 1),
                (3, 'Ready',     1, 'Cash', 0)
        ) order_seed(order_no, order_status, eco_friendly_packaging, payment_method, days_ago)
        WHERE s.is_active = 1
    )
    INSERT INTO Orders (
        patron_id,
        stall_id,
        promotion_id,
        order_status,
        total_amount,
        order_date,
        checkout_id,
        collection_method,
        delivery_address,
        postal_code,
        delivery_charge,
        payment_method,
        eco_friendly_packaging
    )
    OUTPUT
        INSERTED.order_id,
        INSERTED.stall_id,
        CAST(RIGHT(INSERTED.checkout_id, 1) AS INT)
    INTO @InsertedOrders (order_id, stall_id, order_no)
    SELECT
        @SeedPatronId,
        stall_id,
        NULL,
        order_status,
        price + CASE WHEN eco_friendly_packaging = 1 THEN 0.20 ELSE 0.00 END,
        DATEADD(DAY, -days_ago, GETDATE()),
        CONCAT('SEED-', stall_id, '-', order_no),
        'Pickup',
        NULL,
        NULL,
        0.00,
        payment_method,
        eco_friendly_packaging
    FROM StallOrderSeed;

    -- =========================================================
    -- Seed OrderItems
    -- Each inserted order gets one item from that stall.
    -- =========================================================

    INSERT INTO OrderItems (
        order_id,
        menu_item_id,
        quantity,
        unit_price,
        subtotal,
        item_name
    )
    SELECT
        io.order_id,
        mi.menu_item_id,
        1,
        mi.price,
        mi.price,
        mi.item_name
    FROM @InsertedOrders io
    CROSS APPLY (
        SELECT TOP 1
            m.menu_item_id,
            m.item_name,
            m.price
        FROM MenuItems m
        WHERE m.stall_id = io.stall_id
        ORDER BY m.menu_item_id
    ) mi;
END;
GO



UPDATE Orders
SET 
    checkout_id = 'SEED-OLD-1',
    collection_method = 'Pickup',
    delivery_address = NULL,
    postal_code = NULL,
    delivery_charge = 0.00,
    payment_method = 'Cash',
    eco_friendly_packaging = 1
WHERE order_id = 1;
GO

UPDATE Orders
SET 
    checkout_id = 'SEED-OLD-1',
    collection_method = 'Pickup',
    delivery_address = NULL,
    postal_code = NULL,
    delivery_charge = 0.00,
    payment_method = 'Cash',
    eco_friendly_packaging = 1
WHERE order_id = 1;
GO

-- =========================================================
-- Seed MenuItemCuisines
-- Links menu items to cuisine categories.
-- This helps with cuisine filtering/searching.
-- =========================================================

INSERT INTO MenuItemCuisines (menu_item_id, cuisine_id)
SELECT 
    mi.menu_item_id,
    c.cuisine_id
FROM MenuItems mi
INNER JOIN Stalls s
    ON mi.stall_id = s.stall_id
INNER JOIN Cuisines c
    ON s.cuisine_id = c.cuisine_id
WHERE NOT EXISTS (
    SELECT 1
    FROM MenuItemCuisines mic
    WHERE mic.menu_item_id = mi.menu_item_id
      AND mic.cuisine_id = c.cuisine_id
);
GO

-- =========================================================
-- Seed UserLikesMenuItem
-- Sample likes from patron users to menu items.
-- This helps test the menu item like/favourite feature.
-- =========================================================

INSERT INTO UserLikesMenuItem (user_id, menu_item_id)
SELECT 
    u.user_id,
    mi.menu_item_id
FROM Users u
CROSS APPLY (
    SELECT TOP 3 menu_item_id
    FROM MenuItems
    ORDER BY menu_item_id
) mi
WHERE u.role = 'patron'
  AND NOT EXISTS (
      SELECT 1
      FROM UserLikesMenuItem ul
      WHERE ul.user_id = u.user_id
        AND ul.menu_item_id = mi.menu_item_id
  );
GO

-- =========================================================
-- Seed Feedbacks
-- Sample feedback records from patron users to stalls.
-- =========================================================

INSERT INTO Feedbacks (
    patron_id,
    stall_id,
    rating,
    comment,
    created_at,
    photo_path
)
SELECT
    u.user_id,
    s.stall_id,
    feedback_seed.rating,
    feedback_seed.comment,
    DATEADD(DAY, -feedback_seed.days_ago, GETDATE()),
    feedback_seed.photo_path
FROM Stalls s
CROSS APPLY (
    SELECT TOP 1 user_id
    FROM Users
    WHERE role = 'patron'
    ORDER BY user_id
) u
CROSS JOIN (
    VALUES
        (5, 'Food was fresh and tasty. Service was also fast.', 5, NULL),
        (4, 'Good portion size and reasonable price.', 3, NULL),
        (3, 'Taste was okay, but waiting time could be improved.', 1, NULL)
) feedback_seed(rating, comment, days_ago, photo_path)
WHERE s.is_active = 1;
GO

-- =========================================================
-- Seed SavedAddresses
-- Sample saved delivery addresses for patron users.
-- =========================================================

INSERT INTO SavedAddresses (
    patron_id,
    address,
    postal_code,
    contact_name,
    contact_phone,
    created_at
)
SELECT
    u.user_id,
    address_seed.address,
    address_seed.postal_code,
    u.full_name,
    address_seed.contact_phone,
    GETDATE()
FROM Users u
CROSS JOIN (
    VALUES
        ('123 Sample Street #05-01', '123456', '91234567'),
        ('456 Test Avenue #08-12', '234567', '92345678'),
        ('789 Demo Road #10-03', '345678', '93456789')
) address_seed(address, postal_code, contact_phone)
WHERE u.role = 'patron';
GO


-- =========================================================
-- Seed RentalAgreements
-- Sample lease/rental agreements for stalls.
-- =========================================================

INSERT INTO RentalAgreements (
    stall_id,
    lease_start_date,
    lease_end_date,
    monthly_rent,
    agreement_status,
    created_at,
    is_accepted,
    acceptance_timestamp
)
SELECT
    s.stall_id,
    DATEADD(MONTH, -1, CAST(GETDATE() AS DATE)),
    DATEADD(MONTH, 11, CAST(GETDATE() AS DATE)),
    CASE 
        WHEN s.stall_id % 3 = 0 THEN 1800.00
        WHEN s.stall_id % 3 = 1 THEN 1500.00
        ELSE 1650.00
    END,
    CASE 
        WHEN s.stall_id % 3 = 0 THEN 'Expired'
        WHEN s.stall_id % 3 = 1 THEN 'Active'
        ELSE 'Terminated'
    END,
    GETDATE(),
    CASE 
        WHEN s.stall_id % 2 = 0 THEN 1
        ELSE 0
    END,
    CASE 
        WHEN s.stall_id % 2 = 0 THEN GETDATE()
        ELSE NULL
    END
FROM Stalls s
WHERE s.is_active = 1;
GO


-- =========================================================
-- Seed Inspections
-- Sample NEA inspection records for stalls.
-- Includes Scheduled, Completed, and Cancelled inspections.
-- =========================================================

DECLARE @OfficerId INT;

SELECT TOP 1 @OfficerId = user_id
FROM Users
WHERE role = 'officer'
ORDER BY user_id;

IF @OfficerId IS NULL
BEGIN
    PRINT 'No officer account found. Inspections were not inserted.';
END
ELSE
BEGIN
    INSERT INTO Inspections (
        stall_id,
        officer_id,
        inspection_date,
        hygiene_grade,
        remarks,
        inspection_status,
        score,
        result,
        completed_at
    )
    SELECT
        s.stall_id,
        @OfficerId,

        -- Different inspection dates for testing
        CASE 
            WHEN s.stall_id % 3 = 0 THEN DATEADD(DAY, 7, GETDATE())
            WHEN s.stall_id % 3 = 1 THEN DATEADD(DAY, -5, GETDATE())
            ELSE DATEADD(DAY, -2, GETDATE())
        END,

        -- Only completed inspections should have hygiene grade
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            WHEN s.stall_id % 3 = 1 THEN 'A'
            ELSE 'B'
        END,

        CASE 
            WHEN s.stall_id % 3 = 0 THEN 'Inspection has been scheduled and is waiting to be completed.'
            WHEN s.stall_id % 3 = 1 THEN 'Stall is clean and food preparation area is well maintained.'
            ELSE 'Stall is generally clean but minor improvements are needed.'
        END,

        CASE 
            WHEN s.stall_id % 3 = 0 THEN 'Scheduled'
            WHEN s.stall_id % 3 = 1 THEN 'Completed'
            ELSE 'Completed'
        END,

        -- Only completed inspections should have score
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            WHEN s.stall_id % 3 = 1 THEN 92
            ELSE 78
        END,

        -- Only completed inspections should have result
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            WHEN s.stall_id % 3 = 1 THEN 'Pass'
            ELSE 'Needs Follow-up'
        END,

        -- Only completed inspections should have completed_at
        CASE 
            WHEN s.stall_id % 3 = 0 THEN NULL
            ELSE GETDATE()
        END
    FROM Stalls s
    WHERE s.is_active = 1;
END;
GO

-- =========================================================
-- Sync latest completed inspection grade to Stalls table
-- This makes hygiene grade appear on stall/vendor/patron pages.
-- =========================================================

UPDATE s
SET s.current_hygiene_grade = latest.hygiene_grade
FROM Stalls s
INNER JOIN (
    SELECT 
        i.stall_id,
        i.hygiene_grade,
        ROW_NUMBER() OVER (
            PARTITION BY i.stall_id 
            ORDER BY i.completed_at DESC, i.inspection_id DESC
        ) AS rn
    FROM Inspections i
    WHERE i.inspection_status = 'Completed'
      AND i.hygiene_grade IS NOT NULL
) latest
    ON s.stall_id = latest.stall_id
WHERE latest.rn = 1;
GO
