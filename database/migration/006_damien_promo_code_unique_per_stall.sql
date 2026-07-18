USE HawkerDB;
GO

-- BED-47 fix: promo_code was declared inline as `UNIQUE`, which SQL Server
-- enforces globally across ALL stalls (one auto-named constraint for the
-- whole column). That means once Stall 1 claims "SAVE10", no other stall
-- can ever use "SAVE10" - contradicting BED-47's acceptance criteria,
-- which only requires blocking duplicates "for their stall".
--
-- This finds that auto-generated single-column UNIQUE constraint on
-- Promotions.promo_code and drops it, then replaces it with a composite
-- UNIQUE(stall_id, promo_code) constraint - so codes are unique per stall,
-- not across the whole platform.

DECLARE @constraintName NVARCHAR(200);

SELECT @constraintName = kc.name
FROM sys.key_constraints kc
INNER JOIN sys.index_columns ic
    ON kc.parent_object_id = ic.object_id AND kc.unique_index_id = ic.index_id
INNER JOIN sys.columns c
    ON ic.object_id = c.object_id AND ic.column_id = c.column_id
WHERE kc.parent_object_id = OBJECT_ID('Promotions')
  AND kc.type = 'UQ'
  AND c.name = 'promo_code'
  -- only match a single-column unique constraint, not a composite one
  AND (SELECT COUNT(*) FROM sys.index_columns ic2
       WHERE ic2.object_id = kc.parent_object_id AND ic2.index_id = kc.unique_index_id) = 1;

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Promotions DROP CONSTRAINT ' + @constraintName);
END
GO

-- Replace it with a per-stall unique constraint.
ALTER TABLE Promotions
    ADD CONSTRAINT UQ_Promotions_Stall_PromoCode UNIQUE (stall_id, promo_code);
GO
