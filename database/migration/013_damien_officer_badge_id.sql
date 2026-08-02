-- Add badge_id for officer login verification (NEA officers must enter
-- their badge ID, in addition to email/password, before OTP - this sets
-- officer login apart from the other role logins).
-- NULL for non-officer roles - it's only meaningful for officer accounts.

USE HawkerDB__Official;
GO

IF COL_LENGTH('Users', 'badge_id') IS NULL
BEGIN
    ALTER TABLE Users
    ADD badge_id VARCHAR(20) NULL;
END;
GO

UPDATE Users SET badge_id = 'NEA-0042' WHERE email = 'tanisanofficer@example.com';

UPDATE Users SET badge_id = 'OPS-01' WHERE email = 'limisanoperator@example.com';