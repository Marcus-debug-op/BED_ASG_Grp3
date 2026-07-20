-- BED-146 NEA Inspection Scheduling

-- Update status constraint to support scheduling flow.
-- Drop old constraint first if it exists.
IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = 'CK_Inspections_Status'
)
BEGIN
    ALTER TABLE Inspections DROP CONSTRAINT CK_Inspections_Status;
END;
GO

-- Add new status constraint.
ALTER TABLE Inspections
ADD CONSTRAINT CK_Inspections_Status
CHECK (inspection_status IN ('Scheduled', 'Completed', 'Cancelled'));
GO

-- Change default status to Scheduled for newly scheduled inspections.
IF EXISTS (
    SELECT 1
    FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID('Inspections')
      AND COL_NAME(parent_object_id, parent_column_id) = 'inspection_status'
)
BEGIN
    DECLARE @constraintName NVARCHAR(200);

    SELECT @constraintName = name
    FROM sys.default_constraints
    WHERE parent_object_id = OBJECT_ID('Inspections')
      AND COL_NAME(parent_object_id, parent_column_id) = 'inspection_status';

    EXEC('ALTER TABLE Inspections DROP CONSTRAINT ' + @constraintName);
END;
GO

ALTER TABLE Inspections
ADD CONSTRAINT DF_Inspections_Status
DEFAULT 'Scheduled' FOR inspection_status;
GO