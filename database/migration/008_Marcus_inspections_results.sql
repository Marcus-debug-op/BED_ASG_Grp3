
-- Add score column to store hygiene score from 0 to 100
IF COL_LENGTH('Inspections', 'score') IS NULL
BEGIN
    ALTER TABLE Inspections
    ADD score INT NULL;
END;
GO

-- Add result column to store Pass / Fail / Needs Follow-up
IF COL_LENGTH('Inspections', 'result') IS NULL
BEGIN
    ALTER TABLE Inspections
    ADD result VARCHAR(50) NULL;
END;
GO

-- Add completed_at column to store when the inspection was completed
IF COL_LENGTH('Inspections', 'completed_at') IS NULL
BEGIN
    ALTER TABLE Inspections
    ADD completed_at DATETIME NULL;
END;
GO

-- Add current hygiene grade to Stalls table
-- This stores the latest grade for each stall after inspection completion
IF COL_LENGTH('Stalls', 'current_hygiene_grade') IS NULL
BEGIN
    ALTER TABLE Stalls
    ADD current_hygiene_grade VARCHAR(5) NULL;
END;
GO