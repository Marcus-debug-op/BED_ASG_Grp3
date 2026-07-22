-- Add account status fields for account deactivation

IF COL_LENGTH('Users', 'is_active') IS NULL
BEGIN
    ALTER TABLE Users
    ADD is_active BIT NOT NULL DEFAULT 1;
END;
GO

IF COL_LENGTH('Users', 'deactivated_at') IS NULL
BEGIN
    ALTER TABLE Users
    ADD deactivated_at DATETIME NULL;
END;
GO