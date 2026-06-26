USE HawkerDB;
GO

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