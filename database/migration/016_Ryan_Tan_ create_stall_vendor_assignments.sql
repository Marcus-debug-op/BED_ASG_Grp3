USE HawkerDB;
GO

-- ============================================================================
-- BED-145: Vendor Assignment API (Ryan Tan)
--
-- Records WHICH vendor occupies WHICH stall over time. This is distinct from
-- BED-28 (operator stall record management), which only stores the current
-- vendor_id directly on the Stalls row. This table keeps an assignment history
-- so a stall can have multiple historical assignments (as the story requires),
-- and lets the operator see, and change, the current occupant of a stall.
--
-- "Current" assignment  = the row for that stall where vacated_date IS NULL.
-- Reassigning a stall    = vacate the current row, then insert a new one.
-- ============================================================================

IF OBJECT_ID('dbo.StallVendorAssignments', 'U') IS NULL
BEGIN
    CREATE TABLE StallVendorAssignments (
        assignment_id  INT IDENTITY(1,1) PRIMARY KEY,
        stall_id       INT NOT NULL,
        vendor_id      INT NOT NULL,               -- Users.user_id where role = 'vendor'
        assigned_date  DATETIME NOT NULL DEFAULT GETDATE(),
        vacated_date   DATETIME NULL,              -- NULL = this is the current occupant
        assigned_by    INT NULL,                   -- operator (Users.user_id) who made the assignment

        CONSTRAINT FK_SVA_Stall  FOREIGN KEY (stall_id)  REFERENCES Stalls(stall_id),
        CONSTRAINT FK_SVA_Vendor FOREIGN KEY (vendor_id) REFERENCES Users(user_id),
        CONSTRAINT FK_SVA_Operator FOREIGN KEY (assigned_by) REFERENCES Users(user_id)
    );
END
GO

-- Guarantees a stall can have AT MOST ONE current (un-vacated) assignment.
-- A filtered unique index is how SQL Server enforces "one active row per stall"
-- while still allowing many historical (vacated) rows for the same stall.
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'UX_SVA_OneCurrentPerStall'
)
BEGIN
    CREATE UNIQUE INDEX UX_SVA_OneCurrentPerStall
        ON StallVendorAssignments (stall_id)
        WHERE vacated_date IS NULL;
END
GO

-- Optional: seed the history from whatever vendors the Stalls table already
-- points at, so existing stalls show as "currently assigned" from day one.
-- Safe to run once; the WHERE NOT EXISTS stops it duplicating on re-runs.
INSERT INTO StallVendorAssignments (stall_id, vendor_id, assigned_by)
SELECT s.stall_id, s.vendor_id, NULL
FROM Stalls s
WHERE NOT EXISTS (
    SELECT 1 FROM StallVendorAssignments a
    WHERE a.stall_id = s.stall_id AND a.vacated_date IS NULL
);
GO