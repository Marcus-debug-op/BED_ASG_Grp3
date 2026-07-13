-- =====================================================================
-- Seed data for the migration above.
-- Run this AFTER migration_menu_cuisines_and_complaint_notes.sql.
-- Safe to run once - re-running will fail on the UNIQUE cuisine_name /
-- duplicate email constraints, which just means it's already seeded.
-- =====================================================================

USE HawkerDB;
GO

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
-- return. Adjust the patron email / stall name below if yours differ.
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

USE HawkerDB;
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