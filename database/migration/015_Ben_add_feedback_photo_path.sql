-- BED-132: patrons can attach a photo to their feedback for a stall.
-- Scoped to Feedbacks.stall_id staying required (matching BED-2/92's
-- existing behavior and tests) - only adding a place to store the photo.

IF COL_LENGTH('dbo.Feedbacks', 'photo_path') IS NULL
BEGIN
    ALTER TABLE Feedbacks
    ADD photo_path VARCHAR(255) NULL;
END;
